-- Migration script to add new book metadata columns for Amazon integration
-- This adds isbn, external_id, published_date, publisher, and page_count columns to the books table

-- Check if the columns already exist before adding them (to make this script idempotent)
DO $$
BEGIN
    -- Add isbn column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'books' AND column_name = 'isbn'
    ) THEN
        ALTER TABLE books ADD COLUMN isbn TEXT;
    END IF;

    -- Add external_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'books' AND column_name = 'external_id'
    ) THEN
        ALTER TABLE books ADD COLUMN external_id TEXT;
    END IF;

    -- Add published_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'books' AND column_name = 'published_date'
    ) THEN
        ALTER TABLE books ADD COLUMN published_date TEXT;
    END IF;

    -- Add publisher column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'books' AND column_name = 'publisher'
    ) THEN
        ALTER TABLE books ADD COLUMN publisher TEXT;
    END IF;

    -- Add page_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'books' AND column_name = 'page_count'
    ) THEN
        ALTER TABLE books ADD COLUMN page_count INTEGER;
    END IF;

    -- Output a message indicating success
    RAISE NOTICE 'Book metadata columns added successfully';
END
$$;

-- Update RLS policies to include new columns

-- First, check if the insert policy exists, and if so, drop and recreate it
DO $$
BEGIN
    -- Check if the insert policy exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'books' AND policyname = 'Enable insert for authenticated users only'
    ) THEN
        -- Drop the existing policy
        DROP POLICY "Enable insert for authenticated users only" ON books;
    END IF;
END
$$;

-- Recreate the insert policy with all columns
CREATE POLICY "Enable insert for authenticated users only" ON books 
FOR INSERT TO authenticated 
WITH CHECK (
    auth.uid() IN (
        SELECT id FROM profiles WHERE is_admin = true
    )
);

-- Check if the update policy exists, and if so, drop and recreate it
DO $$
BEGIN
    -- Check if the update policy exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'books' AND policyname = 'Enable update for admins only'
    ) THEN
        -- Drop the existing policy
        DROP POLICY "Enable update for admins only" ON books;
    END IF;
END
$$;

-- Recreate the update policy with all columns
CREATE POLICY "Enable update for admins only" ON books 
FOR UPDATE TO authenticated 
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE is_admin = true
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT id FROM profiles WHERE is_admin = true
    )
);

-- Add index on external_id for faster lookups
DO $$
BEGIN
    -- Create index on external_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'books' AND indexname = 'books_external_id_idx'
    ) THEN
        CREATE INDEX books_external_id_idx ON books(external_id);
    END IF;
    
    -- Create index on isbn if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'books' AND indexname = 'books_isbn_idx'
    ) THEN
        CREATE INDEX books_isbn_idx ON books(isbn);
    END IF;
END
$$;
