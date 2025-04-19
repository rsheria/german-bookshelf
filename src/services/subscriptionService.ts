import { supabase } from './supabase';

// Types for subscription stats
export interface SubscriptionStats {
  free_count: number;
  premium_count: number;
  total_referrals: number;
}

// Fetch counts of free vs premium users and total referrals
export const getSubscriptionStats = async (): Promise<SubscriptionStats> => {
  try {
    const { data, error } = await supabase.rpc('get_subscription_stats');
    if (error) throw error;
    const stats = Array.isArray(data) ? data[0] : data;
    return {
      free_count: stats.free_count || 0,
      premium_count: stats.premium_count || 0,
      total_referrals: stats.total_referrals || 0,
    };
  } catch (err) {
    console.error('Error fetching subscription stats:', err);
    return { free_count: 0, premium_count: 0, total_referrals: 0 };
  }
};

// Update a user's subscription plan
export const updateSubscriptionPlan = async (
  userId: string,
  plan: 'free' | 'premium'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_plan: plan })
      .eq('id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating subscription plan:', err);
    return false;
  }
};
