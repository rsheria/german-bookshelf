-- Migration: Add seq_no and slug to books for SEO URLs
BEGIN;

-- 1) Add seq_no and slug columns
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS seq_no integer,
  ADD COLUMN IF NOT EXISTS slug text;

-- 2) Create per-type sequences
CREATE SEQUENCE IF NOT EXISTS book_seq;
CREATE SEQUENCE IF NOT EXISTS audiobook_seq;

-- 3) Slugify helper
CREATE OR REPLACE FUNCTION public.slugify(input text) RETURNS text
  LANGUAGE SQL IMMUTABLE AS $$
    SELECT lower(
      regexp_replace(
        regexp_replace(input, '[^a-zA-Z0-9 ]', '', 'g'),
        '\s+', '-', 'g'
      )
    );
$$;

-- 4) Backfill existing records
WITH numbered AS (
  SELECT id, type,
    row_number() OVER (PARTITION BY type ORDER BY created_at) AS rn
  FROM public.books
)
UPDATE public.books b
SET seq_no = n.rn,
    slug = public.slugify(b.title)
FROM numbered n
WHERE b.id = n.id;

-- 5) Advance sequences
SELECT setval('book_seq', COALESCE((SELECT max(seq_no) FROM public.books WHERE type='ebook'), 0));
SELECT setval('audiobook_seq', COALESCE((SELECT max(seq_no) FROM public.books WHERE type='audiobook'), 0));

-- 6) Trigger to assign seq_no & slug on insert
CREATE OR REPLACE FUNCTION public.assign_book_seq_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.seq_no IS NULL OR NEW.seq_no = 0 THEN
    IF NEW.type = 'ebook' THEN
      NEW.seq_no = nextval('book_seq');
    ELSIF NEW.type = 'audiobook' THEN
      NEW.seq_no = nextval('audiobook_seq');
    ELSE
      NEW.seq_no = nextval('book_seq');
    END IF;
  END IF;
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = public.slugify(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assign_book_seq_slug ON public.books;
CREATE TRIGGER trg_assign_book_seq_slug
BEFORE INSERT ON public.books
FOR EACH ROW EXECUTE PROCEDURE public.assign_book_seq_slug();

COMMIT;
