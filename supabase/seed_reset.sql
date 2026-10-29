-- ============================================================================
-- GrowthOS — Safe Test Data Reset & Admin Bootstrap Utility Script
-- Run ONLY in non-production / staging environments via Supabase SQL Editor.
-- ============================================================================

-- 1. Safely clear student test activity while preserving Campaigns, Workshops,
--    Reward Rules, and Published Resources:
begin;
  truncate table
    public.resource_access_events,
    public.reward_unlocks,
    public.referral_attributions,
    public.attendance_records,
    public.project_submissions,
    public.attribution_events
  restart identity cascade;
commit;

-- 2. Bootstrap an Administrator (Replace with your verified account email):
-- update public.profiles
-- set role = 'admin', updated_at = now()
-- where lower(email) = 'your-admin-email@example.com';

-- 3. Revoke Administrator privileges:
-- update public.profiles
-- set role = 'student', updated_at = now()
-- where lower(email) = 'your-admin-email@example.com';

