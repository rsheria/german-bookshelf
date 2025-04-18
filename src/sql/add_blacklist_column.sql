-- Add blacklisted column to the existing categories table if it doesn't exist already
ALTER TABLE "categories" 
ADD COLUMN IF NOT EXISTS "blacklisted" BOOLEAN DEFAULT false;

-- Create an index for faster filtering of blacklisted categories
CREATE INDEX IF NOT EXISTS idx_categories_blacklisted ON "categories"("blacklisted");
