-- ONE LINE FIX: Focuses only on the essential policy changes needed

BEGIN;

-- This is the critical policy that allows users to update their own last_active field
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- This is the critical policy that allows users to insert their own IP logs
DROP POLICY IF EXISTS "Users can insert own IP logs" ON public.ip_logs;
CREATE POLICY "Users can insert own IP logs" ON public.ip_logs 
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create a simple trigger to update last_active when IP logs are created
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles SET last_active = NOW() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the trigger to ip_logs
DROP TRIGGER IF EXISTS update_last_active_trigger ON ip_logs;
CREATE TRIGGER update_last_active_trigger
AFTER INSERT ON ip_logs
FOR EACH ROW
EXECUTE FUNCTION update_last_active();

COMMIT;
