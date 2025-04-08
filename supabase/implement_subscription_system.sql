-- Subscription Plans System, User Banning, and IP Tracking Implementation

-- 1. Create the subscription plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  daily_quota INTEGER NOT NULL,
  monthly_request_quota INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add status, ban reason, and subscription-related fields to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'banned', 'suspended')) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS monthly_request_quota INTEGER DEFAULT 10;

-- 3. Create IP tracking table
CREATE TABLE IF NOT EXISTS user_ips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT NOT NULL,
  location TEXT,
  device_info TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create a unified activity logs table with enhanced tracking
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  ip_address TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_activity_type_idx ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS user_ips_ip_address_idx ON user_ips(ip_address);
CREATE INDEX IF NOT EXISTS user_ips_user_id_idx ON user_ips(user_id);

-- 5. Create default plans
INSERT INTO plans (name, description, price, daily_quota, monthly_request_quota, features)
VALUES 
  ('Free', 'Basic access to German books', 0.00, 3, 10, '{"max_downloads_per_day": 3, "can_request_books": true, "request_priority": "low"}'),
  ('Premium', 'Enhanced access with higher quotas', 9.99, 10, 30, '{"max_downloads_per_day": 10, "can_request_books": true, "request_priority": "medium", "early_access": true}'),
  ('Platinum', 'Unlimited access with highest priority', 19.99, 30, 100, '{"max_downloads_per_day": 30, "can_request_books": true, "request_priority": "high", "early_access": true, "exclusive_content": true}')
ON CONFLICT (name) DO NOTHING;

-- 6. RLS policies for new tables
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Plans policies
CREATE POLICY "Anyone can read plans"
  ON plans FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage plans"
  ON plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- User IPs policies
CREATE POLICY "Users can see their own IP records"
  ON user_ips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can see all IP records"
  ON user_ips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert IP records"
  ON user_ips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update IP records"
  ON user_ips FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Activity logs policies
CREATE POLICY "Users can see their own activity"
  ON activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can see all activity"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 7. Helper functions for the subscription system
CREATE OR REPLACE FUNCTION assign_plan_to_user(user_id UUID, new_plan_id UUID, months INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT COALESCE(profiles.subscription_end_date, NOW()) INTO end_date 
    FROM profiles WHERE id = user_id;
    
    -- If there's an existing subscription, extend it
    IF end_date > NOW() THEN
        end_date := end_date + (months || ' months')::INTERVAL;
    ELSE
        end_date := NOW() + (months || ' months')::INTERVAL;
    END IF;
    
    UPDATE profiles 
    SET 
        plan_id = new_plan_id,
        subscription_start_date = NOW(),
        subscription_end_date = end_date,
        daily_quota = (SELECT daily_quota FROM plans WHERE id = new_plan_id),
        monthly_request_quota = (SELECT monthly_request_quota FROM plans WHERE id = new_plan_id)
    WHERE id = user_id;
    
    -- Log the plan change
    INSERT INTO activity_logs (user_id, activity_type, details)
    VALUES (
        user_id, 
        'plan_changed', 
        jsonb_build_object(
            'plan_id', new_plan_id,
            'subscription_end_date', end_date
        )
    );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban a user
CREATE OR REPLACE FUNCTION ban_user(user_id UUID, reason TEXT, ban_days INTEGER DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    ban_until TIMESTAMP WITH TIME ZONE;
BEGIN
    IF ban_days IS NOT NULL THEN
        ban_until := NOW() + (ban_days || ' days')::INTERVAL;
    END IF;
    
    UPDATE profiles 
    SET 
        status = 'banned',
        ban_reason = reason,
        banned_until = ban_until
    WHERE id = user_id;
    
    -- Log the ban
    INSERT INTO activity_logs (
        user_id, 
        activity_type, 
        details
    )
    VALUES (
        user_id, 
        'user_banned', 
        jsonb_build_object(
            'reason', reason,
            'banned_until', ban_until
        )
    );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban a user
CREATE OR REPLACE FUNCTION unban_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles 
    SET 
        status = 'active',
        ban_reason = NULL,
        banned_until = NULL
    WHERE id = user_id;
    
    -- Log the unban
    INSERT INTO activity_logs (
        user_id, 
        activity_type,
        details
    )
    VALUES (
        user_id, 
        'user_unbanned',
        '{}'::jsonb
    );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to block an IP address
CREATE OR REPLACE FUNCTION block_ip(ip TEXT, reason TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_ips
    SET 
        is_blocked = TRUE,
        block_reason = reason
    WHERE ip_address = ip;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record user IP (called on each login)
CREATE OR REPLACE FUNCTION record_user_ip(user_id UUID, ip TEXT, device TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_ips (user_id, ip_address, device_info)
    VALUES (user_id, ip, device)
    ON CONFLICT (user_id, ip_address) 
    DO UPDATE SET 
        last_seen = NOW(),
        device_info = COALESCE(device, user_ips.device_info);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check if a user is banned before allowing login
CREATE OR REPLACE FUNCTION check_user_ban_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is banned
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND status = 'banned' 
        AND (banned_until IS NULL OR banned_until > NOW())
    ) THEN
        RAISE EXCEPTION 'User account is banned';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(ip TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_ips
        WHERE ip_address = ip
        AND is_blocked = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
