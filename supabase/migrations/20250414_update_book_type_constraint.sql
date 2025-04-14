-- Drop the existing constraint
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_type_check;

-- Add the new constraint that includes 'Hörbuch'
ALTER TABLE books ADD CONSTRAINT books_type_check CHECK (type IN ('audiobook', 'ebook', 'Hörbuch'));

-- Update any existing audiobook records to use 'Hörbuch' if preferred
-- Uncomment the following line if you want to convert all existing audiobooks
-- UPDATE books SET type = 'Hörbuch' WHERE type = 'audiobook';
