-- Migration: Add audiobook/ebook fields and categories array to books table

ALTER TABLE books
ADD COLUMN IF NOT EXISTS narrator TEXT,
ADD COLUMN IF NOT EXISTS audio_length TEXT,
ADD COLUMN IF NOT EXISTS audio_format TEXT,
ADD COLUMN IF NOT EXISTS ebook_format TEXT,
ADD COLUMN IF NOT EXISTS file_size TEXT,
ADD COLUMN IF NOT EXISTS categories TEXT[];

-- Optionally, backfill or update data as needed
-- UPDATE books SET categories = ARRAY[]::TEXT[] WHERE categories IS NULL;
