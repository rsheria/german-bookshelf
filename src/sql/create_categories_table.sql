-- SQL script to create and populate the categories table

-- First, create the categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS "categories" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "parent_id" UUID REFERENCES "categories"("id") ON DELETE SET NULL,
    "type" TEXT DEFAULT 'ebook',
    "fictionType" TEXT DEFAULT 'Fiction',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on type and fictionType for faster filtering
CREATE INDEX IF NOT EXISTS idx_categories_type ON "categories"("type");
CREATE INDEX IF NOT EXISTS idx_categories_fiction_type ON "categories"("fictionType");

-- Create view to count books per category (modify based on your book table structure)
CREATE OR REPLACE VIEW "category_stats" AS
SELECT 
    c.id,
    c.name,
    COUNT(DISTINCT b.id) as book_count
FROM 
    "categories" c
LEFT JOIN 
    "books" b ON b.categories @> ARRAY[c.name]
GROUP BY 
    c.id, c.name;

-- Insert typical book categories if they don't exist
INSERT INTO "categories" ("name", "type", "fictionType") 
VALUES 
-- Fiction categories for E-Books
('thriller', 'ebook', 'Fiction'),
('mystery', 'ebook', 'Fiction'),
('science fiction', 'ebook', 'Fiction'),
('fantasy', 'ebook', 'Fiction'),
('romance', 'ebook', 'Fiction'),
('historical fiction', 'ebook', 'Fiction'),
('horror', 'ebook', 'Fiction'),
('adventure', 'ebook', 'Fiction'),
('literary fiction', 'ebook', 'Fiction'),

-- Non-Fiction categories for E-Books
('biography', 'ebook', 'Non-Fiction'),
('history', 'ebook', 'Non-Fiction'),
('science', 'ebook', 'Non-Fiction'),
('self-help', 'ebook', 'Non-Fiction'),
('business', 'ebook', 'Non-Fiction'),
('cooking', 'ebook', 'Non-Fiction'),
('health', 'ebook', 'Non-Fiction'),
('travel', 'ebook', 'Non-Fiction'),
('philosophy', 'ebook', 'Non-Fiction'),

-- Fiction categories for Audiobooks  
('thriller', 'audiobook', 'Fiction'),
('mystery', 'audiobook', 'Fiction'),
('science fiction', 'audiobook', 'Fiction'),
('fantasy', 'audiobook', 'Fiction'),
('romance', 'audiobook', 'Fiction'),
('historical fiction', 'audiobook', 'Fiction'),
('horror', 'audiobook', 'Fiction'),
('adventure', 'audiobook', 'Fiction'),
('literary fiction', 'audiobook', 'Fiction'),

-- Non-Fiction categories for Audiobooks
('biography', 'audiobook', 'Non-Fiction'),
('history', 'audiobook', 'Non-Fiction'),
('science', 'audiobook', 'Non-Fiction'),
('self-help', 'audiobook', 'Non-Fiction'),
('business', 'audiobook', 'Non-Fiction'),
('cooking', 'audiobook', 'Non-Fiction'),
('health', 'audiobook', 'Non-Fiction'),
('travel', 'audiobook', 'Non-Fiction'),
('philosophy', 'audiobook', 'Non-Fiction')

ON CONFLICT (name, type, "fictionType") DO NOTHING;

-- Update existing books to link to categories
-- This assumes you have a 'categories' array column in your books table
-- If not, you'll need to modify this part based on your actual structure
UPDATE "books" b
SET categories = (
    SELECT ARRAY_AGG(DISTINCT c.name)
    FROM "categories" c
    WHERE 
        (b.type = c.type OR c.type IS NULL) AND
        (b.fictionType = c.fictionType OR c.fictionType IS NULL) AND
        (b.genre ILIKE '%' || c.name || '%')
)
WHERE b.categories IS NULL OR ARRAY_LENGTH(b.categories, 1) = 0;
