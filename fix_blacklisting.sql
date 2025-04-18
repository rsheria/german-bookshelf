-- This script fixes the category blacklisting system once and for all

-- Step 1: Make sure the blacklisted column exists
ALTER TABLE categories ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN;

-- Step 2: Make sure all existing categories have a value for blacklisted - default to FALSE
UPDATE categories SET blacklisted = false WHERE blacklisted IS NULL;

-- Step 3: Create a trigger to ensure all new categories get blacklisted=false by default
CREATE OR REPLACE FUNCTION set_default_blacklisted()
RETURNS TRIGGER AS $$
BEGIN
  NEW.blacklisted = COALESCE(NEW.blacklisted, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_default_blacklisted ON categories;
CREATE TRIGGER set_default_blacklisted
BEFORE INSERT ON categories
FOR EACH ROW
EXECUTE FUNCTION set_default_blacklisted();

-- Step 4: Create an index for fast filtering
DROP INDEX IF EXISTS idx_categories_blacklisted;
CREATE INDEX idx_categories_blacklisted ON categories(blacklisted);

-- For debugging: Show all categories with their blacklisted status
SELECT id, name, blacklisted FROM categories ORDER BY name;
