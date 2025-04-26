-- FINAL WORKING VERSION: Properly handles all dependencies

BEGIN;

-- First drop the trigger, then the function (in the correct order)
DROP TRIGGER IF EXISTS update_last_active_trigger ON public.ip_logs;
DROP FUNCTION IF EXISTS update_last_active_on_ip_log();
DROP FUNCTION IF EXISTS update_last_active();

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

-- Create a simple trigger function with a unique name
CREATE FUNCTION update_last_active_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles SET last_active = NOW() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the trigger to ip_logs (with a different name to avoid any conflicts)
CREATE TRIGGER update_last_active_on_ip_insert
AFTER INSERT ON public.ip_logs
FOR EACH ROW
EXECUTE FUNCTION update_last_active_trigger_function();

COMMIT;
