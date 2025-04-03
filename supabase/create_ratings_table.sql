-- Create a book_ratings table to store user ratings
CREATE TABLE IF NOT EXISTS public.book_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating NUMERIC(3, 1) NOT NULL CHECK (rating >= 1 AND rating <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id) -- Ensure each user can only rate a book once
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_book_ratings_book_id ON public.book_ratings(book_id);
CREATE INDEX IF NOT EXISTS idx_book_ratings_user_id ON public.book_ratings(user_id);

-- Create a function to calculate average rating for a book
CREATE OR REPLACE FUNCTION update_book_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the average rating in the books table
  UPDATE public.books
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM public.book_ratings
    WHERE book_id = NEW.book_id
  )
  WHERE id = NEW.book_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update book rating when a new rating is added
DROP TRIGGER IF EXISTS trigger_update_book_rating ON public.book_ratings;
CREATE TRIGGER trigger_update_book_rating
AFTER INSERT OR UPDATE OR DELETE ON public.book_ratings
FOR EACH ROW EXECUTE FUNCTION update_book_average_rating();

-- Set permissions
ALTER TABLE public.book_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for book_ratings
CREATE POLICY "Users can insert their own ratings" 
  ON public.book_ratings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all ratings" 
  ON public.book_ratings FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own ratings" 
  ON public.book_ratings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" 
  ON public.book_ratings FOR DELETE 
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON TABLE public.book_ratings TO authenticated;
GRANT ALL ON TABLE public.book_ratings TO anon;
GRANT ALL ON TABLE public.book_ratings TO service_role;
