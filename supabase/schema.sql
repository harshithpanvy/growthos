-- ============================================================================
-- GrowthOS — Production PostgreSQL Schema, RLS Policies, Triggers & Functions
-- Target: Supabase PostgreSQL
-- Workshop: "Build Your First AI Project in 60 Minutes"
-- ============================================================================
-- Run this migration in the Supabase SQL Editor or via `supabase db push`.
-- It is idempotent and safely creates/updates tables, constraints, indexes,
-- triggers, security-definer RPCs, Row Level Security policies, and default
-- configuration records (without fabricating any student or analytics data).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. UTILITY TRIGGER FOR updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. PROFILES TABLE (References auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  college text,
  graduation_year text,
  role text not null default 'student' check (role in ('student', 'admin')),
  acquisition_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_page text,
  referral_code text not null unique,
  referred_by uuid references public.profiles(id) on delete set null,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_referral check (referred_by is null or referred_by <> id),
  constraint referral_code_format check (char_length(referral_code) between 6 and 24)
);

-- Ensure columns exist if upgrading from an earlier schema
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists utm_source text;
alter table public.profiles add column if not exists utm_medium text;
alter table public.profiles add column if not exists utm_campaign text;
alter table public.profiles add column if not exists landing_page text;
alter table public.profiles add column if not exists email_verified boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_referred_by_idx on public.profiles(referred_by);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_college_idx on public.profiles(college);
create index if not exists profiles_grad_year_idx on public.profiles(graduation_year);
create index if not exists profiles_acq_source_idx on public.profiles(acquisition_source);
create unique index if not exists profiles_email_lower_idx on public.profiles(lower(email));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. ADMIN AUTHORIZATION HELPER (Trusted Server/Database Check)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Prevent students from escalating their own role or tampering with immutable fields
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Allow trusted database/service-role operations (where auth.uid() is null) or verified admins
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Permission denied: cannot modify user role';
    end if;
    if new.referral_code is distinct from old.referral_code then
      raise exception 'Permission denied: cannot modify referral code';
    end if;
    if new.referred_by is distinct from old.referred_by then
      raise exception 'Permission denied: cannot modify referral attribution';
    end if;
    if lower(new.email) is distinct from lower(old.email) then
      raise exception 'Permission denied: cannot modify registered email directly';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_escalation on public.profiles;
create trigger profiles_prevent_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_profile_privilege_escalation();

-- ----------------------------------------------------------------------------
-- 4. CAMPAIGNS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  registration_goal integer not null default 500 check (registration_goal > 0),
  start_date date not null default current_date,
  end_date date not null default (current_date + interval '7 days')::date,
  budget_cap_inr numeric(10,2) not null default 2000.00 check (budget_cap_inr >= 0),
  actual_spend_inr numeric(10,2) not null default 0.00 check (actual_spend_inr >= 0),
  utm_campaign text not null default 'ai_project_60m',
  channel_targets jsonb not null default '{"college_clubs": 250, "whatsapp_communities": 150, "social_posts": 70, "referral_conversions": 30}'::jsonb,
  budget_allocation jsonb not null default '{"paid_promotion_inr": 1000, "ambassador_materials_inr": 500, "contingency_inr": 500}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_campaign_dates check (end_date >= start_date)
);

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. WORKSHOPS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Build Your First AI Project in 60 Minutes',
  subtitle text not null default '60 Minutes. One AI Project. Your First Step.',
  description text not null default 'A practical, hands-on build session for final-year engineering students to scope, build, and deploy a working AI application with structured outputs and guardrails.',
  scheduled_at timestamptz,
  timezone text not null default 'Asia/Kolkata (IST)',
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  joining_url text,
  agenda jsonb not null default '[]'::jsonb,
  preparation_checklist jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  project_submissions_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists workshops_set_updated_at on public.workshops;
create trigger workshops_set_updated_at
  before update on public.workshops
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. ATTRIBUTION EVENTS TABLE (Funnel & UTM Context)
-- ----------------------------------------------------------------------------
create table if not exists public.attribution_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('landing_view', 'registration_started', 'registration_completed', 'referral_shared')),
  user_id uuid references public.profiles(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_page text,
  referral_code text,
  session_fingerprint text,
  created_at timestamptz not null default now()
);

create index if not exists attribution_events_type_idx on public.attribution_events(event_type);
create index if not exists attribution_events_created_at_idx on public.attribution_events(created_at desc);
create index if not exists attribution_events_utm_source_idx on public.attribution_events(utm_source);

-- ----------------------------------------------------------------------------
-- 7. REFERRAL ATTRIBUTIONS & QUALIFICATION EVENTS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles(id) on delete cascade,
  referral_code_used text not null,
  status text not null default 'pending' check (status in ('pending', 'qualified', 'flagged', 'rejected')),
  qualification_policy text not null default 'account_verified',
  qualified_at timestamptz,
  suspicious_flag boolean not null default false,
  suspicious_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_reason text,
  review_action text check (review_action is null or review_action in ('approve', 'flag', 'reject')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_no_self check (referrer_id <> referred_user_id)
);

create index if not exists referral_attributions_referrer_idx on public.referral_attributions(referrer_id, status);
create index if not exists referral_attributions_status_idx on public.referral_attributions(status);

drop trigger if exists referral_attributions_set_updated_at on public.referral_attributions;
create trigger referral_attributions_set_updated_at
  before update on public.referral_attributions
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. REWARD RULES, RESOURCES, REWARD UNLOCKS & RESOURCE ACCESS EVENTS
-- ----------------------------------------------------------------------------
create table if not exists public.reward_rules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  milestone_name text not null,
  description text not null,
  required_referrals integer not null check (required_referrals >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reward_rules_threshold_idx on public.reward_rules(required_referrals asc);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  resource_type text not null default 'guide' check (resource_type in ('guide', 'template', 'prompt_pack', 'roadmap', 'link', 'checklist')),
  unlock_threshold integer not null default 0 check (unlock_threshold >= 0),
  reward_rule_id uuid references public.reward_rules(id) on delete set null,
  content_markdown text,
  external_url text,
  storage_bucket text,
  storage_path text,
  is_published boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resources_threshold_idx on public.resources(unlock_threshold asc);
create index if not exists resources_published_idx on public.resources(is_published, is_archived);

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
  before update on public.resources
  for each row execute procedure public.set_updated_at();

create table if not exists public.reward_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_rule_id uuid not null references public.reward_rules(id) on delete cascade,
  unlock_reason text not null default 'milestone_reached',
  qualified_referrals_at_unlock integer not null default 0,
  unlocked_at timestamptz not null default now(),
  constraint unique_user_reward_unlock unique (user_id, reward_rule_id)
);

create index if not exists reward_unlocks_user_idx on public.reward_unlocks(user_id);

create table if not exists public.resource_access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  action text not null default 'view' check (action in ('view', 'download', 'copy')),
  accessed_at timestamptz not null default now()
);

create index if not exists resource_access_resource_idx on public.resource_access_events(resource_id);
create index if not exists resource_access_user_idx on public.resource_access_events(user_id);

-- ----------------------------------------------------------------------------
-- 9. ATTENDANCE RECORDS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'attended', 'absent')),
  source text not null default 'manual_admin' check (source in ('registration', 'manual_admin', 'csv_import')),
  marked_by uuid references public.profiles(id) on delete set null,
  notes text,
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_workshop_user_attendance unique (workshop_id, user_id)
);

create index if not exists attendance_records_status_idx on public.attendance_records(status);
create index if not exists attendance_records_user_idx on public.attendance_records(user_id);

-- ----------------------------------------------------------------------------
-- 10. PROJECT SUBMISSIONS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workshop_id uuid references public.workshops(id) on delete set null,
  title text not null,
  problem_statement text not null,
  description text not null,
  tech_stack text not null default '',
  repo_url text,
  demo_url text,
  notes text,
  ai_rubric_score integer check (ai_rubric_score is null or (ai_rubric_score between 0 and 100)),
  ai_rubric_breakdown jsonb,
  review_status text not null default 'submitted' check (review_status in ('submitted', 'under_review', 'approved', 'needs_work')),
  reviewer_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_submissions_user_idx on public.project_submissions(user_id);
create index if not exists project_submissions_status_idx on public.project_submissions(review_status);

drop trigger if exists project_submissions_set_updated_at on public.project_submissions;
create trigger project_submissions_set_updated_at
  before update on public.project_submissions
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. ADMIN AUDIT LOGS TABLE (Immutable for non-service operations)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 12. ATOMIC REFERRAL & REWARD EVALUATION FUNCTIONS
-- ----------------------------------------------------------------------------

-- Count qualified referrals for any given user
create or replace function public.get_qualified_referral_count(target_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.referral_attributions ra
  where ra.referrer_id = target_user_id
    and ra.status = 'qualified';
$$;

-- Backward-compatible RPC for current authenticated student's qualified referral count
create or replace function public.my_referral_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select count(*)::integer
      from public.referral_attributions ra
      where ra.referrer_id = auth.uid()
        and ra.status = 'qualified'
    ),
    0
  );
$$;

revoke all on function public.my_referral_count() from public;
grant execute on function public.my_referral_count() to authenticated;

-- Idempotent evaluation of reward milestones for a student
create or replace function public.evaluate_and_unlock_rewards(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  qualified_count integer;
  inserted_count integer := 0;
begin
  if target_user_id is null then
    return 0;
  end if;

  select count(*)::integer into qualified_count
  from public.referral_attributions ra
  where ra.referrer_id = target_user_id
    and ra.status = 'qualified';

  insert into public.reward_unlocks (
    user_id,
    reward_rule_id,
    unlock_reason,
    qualified_referrals_at_unlock
  )
  select
    target_user_id,
    rr.id,
    case
      when rr.required_referrals = 0 then 'starter_kit_registration'
      else format('reached_%s_qualified_referrals', rr.required_referrals)
    end,
    qualified_count
  from public.reward_rules rr
  where rr.is_active = true
    and rr.required_referrals <= qualified_count
  on conflict (user_id, reward_rule_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Privacy-safe referral history for the currently signed-in student
-- Never exposes referred students' email addresses!
create or replace function public.get_my_referral_history()
returns table (
  attribution_id uuid,
  referred_display_name text,
  referred_college text,
  status text,
  created_at timestamptz,
  qualified_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ra.id as attribution_id,
    case
      when length(trim(p.full_name)) > 0 then
        split_part(trim(p.full_name), ' ', 1) || ' ' ||
        coalesce(nullif(substr(split_part(trim(p.full_name), ' ', 2), 1, 1), '') || '.', '')
      else 'Student Peer'
    end as referred_display_name,
    coalesce(p.college, 'Engineering Campus') as referred_college,
    ra.status,
    ra.created_at,
    ra.qualified_at
  from public.referral_attributions ra
  join public.profiles p on p.id = ra.referred_user_id
  where ra.referrer_id = auth.uid()
  order by ra.created_at desc;
$$;

revoke all on function public.get_my_referral_history() from public;
grant execute on function public.get_my_referral_history() to authenticated;

-- ----------------------------------------------------------------------------
-- 13. AUTH USER CREATION & EMAIL CONFIRMATION TRIGGERS
-- ----------------------------------------------------------------------------
create or replace function public.create_growthos_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref_code text;
  submitted_code text;
  referrer_id uuid;
  referrer_referred_by uuid;
  meta jsonb;
  is_confirmed boolean;
  suspicious boolean := false;
  suspicious_note text := null;
  recent_velocity integer := 0;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  is_confirmed := (new.email_confirmed_at is not null);

  -- Generate unique referral code in format GROW-XXXXXX
  loop
    ref_code := 'GROW-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.profiles p where p.referral_code = ref_code);
  end loop;

  submitted_code := upper(trim(coalesce(meta->>'referral_code', '')));
  if submitted_code <> '' then
    select p.id, p.referred_by
    into referrer_id, referrer_referred_by
    from public.profiles p
    where upper(p.referral_code) = submitted_code
    limit 1;
  end if;

  -- Prevent self-referral and direct 2-node referral loops
  if referrer_id = new.id or referrer_referred_by = new.id then
    referrer_id := null;
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    college,
    graduation_year,
    role,
    acquisition_source,
    utm_source,
    utm_medium,
    utm_campaign,
    landing_page,
    referral_code,
    referred_by,
    email_verified
  ) values (
    new.id,
    coalesce(nullif(trim(meta->>'full_name'), ''), 'Student Builder'),
    lower(trim(coalesce(new.email, ''))),
    nullif(trim(coalesce(meta->>'college', '')), ''),
    nullif(trim(coalesce(meta->>'graduation_year', '')), ''),
    'student',
    nullif(trim(coalesce(meta->>'acquisition_source', '')), ''),
    nullif(trim(coalesce(meta->>'utm_source', '')), ''),
    nullif(trim(coalesce(meta->>'utm_medium', '')), ''),
    nullif(trim(coalesce(meta->>'utm_campaign', '')), ''),
    nullif(trim(coalesce(meta->>'landing_page', '')), ''),
    ref_code,
    referrer_id,
    is_confirmed
  )
  on conflict (id) do nothing;

  -- Unlock 0-referral Starter Kit immediately for the newly registered student
  perform public.evaluate_and_unlock_rewards(new.id);

  -- Record attribution event for registration completion
  insert into public.attribution_events (
    event_type,
    user_id,
    utm_source,
    utm_medium,
    utm_campaign,
    landing_page,
    referral_code
  ) values (
    'registration_completed',
    new.id,
    nullif(trim(coalesce(meta->>'utm_source', '')), ''),
    nullif(trim(coalesce(meta->>'utm_medium', '')), ''),
    nullif(trim(coalesce(meta->>'utm_campaign', '')), ''),
    nullif(trim(coalesce(meta->>'landing_page', '')), ''),
    nullif(submitted_code, '')
  );

  -- Create auditable referral attribution record if referred by a valid student
  if referrer_id is not null then
    -- Check velocity burst (>10 referrals in 10 minutes flags for admin review)
    select count(*)::integer into recent_velocity
    from public.referral_attributions ra
    where ra.referrer_id = referrer_id
      and ra.created_at >= (now() - interval '10 minutes');

    if recent_velocity >= 10 then
      suspicious := true;
      suspicious_note := 'High velocity signup burst (>10 referrals in 10 minutes)';
    end if;

    insert into public.referral_attributions (
      referrer_id,
      referred_user_id,
      referral_code_used,
      status,
      qualification_policy,
      qualified_at,
      suspicious_flag,
      suspicious_reason
    ) values (
      referrer_id,
      new.id,
      submitted_code,
      case
        when suspicious then 'flagged'
        when is_confirmed then 'qualified'
        else 'pending'
      end,
      'email_confirmed_distinct_account',
      case when is_confirmed and not suspicious then now() else null end,
      suspicious,
      suspicious_note
    )
    on conflict (referred_user_id) do nothing;

    if is_confirmed and not suspicious then
      perform public.evaluate_and_unlock_rewards(referrer_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_growthos on auth.users;
create trigger on_auth_user_created_growthos
  after insert on auth.users
  for each row execute procedure public.create_growthos_profile();

-- Qualify pending referral when referred student confirms their email
create or replace function public.handle_auth_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_referrer uuid;
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles
    set email_verified = true,
        updated_at = now()
    where id = new.id;

    update public.referral_attributions
    set status = 'qualified',
        qualified_at = coalesce(qualified_at, now()),
        updated_at = now()
    where referred_user_id = new.id
      and status = 'pending'
      and suspicious_flag = false
    returning referrer_id into target_referrer;

    if target_referrer is not null then
      perform public.evaluate_and_unlock_rewards(target_referrer);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed_growthos on auth.users;
create trigger on_auth_user_confirmed_growthos
  after update of email_confirmed_at on auth.users
  for each row execute procedure public.handle_auth_user_email_confirmed();

-- ----------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.workshops enable row level security;
alter table public.attribution_events enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.reward_rules enable row level security;
alter table public.resources enable row level security;
alter table public.reward_unlocks enable row level security;
alter table public.resource_access_events enable row level security;
alter table public.attendance_records enable row level security;
alter table public.project_submissions enable row level security;
alter table public.admin_audit_logs enable row level security;

-- PROFILES POLICIES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id and role = 'student');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- CAMPAIGNS POLICIES (Public can read active campaigns; only admins can write)
drop policy if exists "campaigns_select_public" on public.campaigns;
create policy "campaigns_select_public" on public.campaigns
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "campaigns_admin_write" on public.campaigns;
create policy "campaigns_admin_write" on public.campaigns
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- WORKSHOPS POLICIES (Public can read published workshops; only admins can write)
drop policy if exists "workshops_select_public" on public.workshops;
create policy "workshops_select_public" on public.workshops
  for select to anon, authenticated
  using (is_published = true or public.is_admin());

drop policy if exists "workshops_admin_write" on public.workshops;
create policy "workshops_admin_write" on public.workshops
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ATTRIBUTION EVENTS POLICIES (Visitors/students can insert landing events; only admins can read)
drop policy if exists "attribution_events_insert" on public.attribution_events;
create policy "attribution_events_insert" on public.attribution_events
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "attribution_events_admin_select" on public.attribution_events;
create policy "attribution_events_admin_select" on public.attribution_events
  for select to authenticated
  using (public.is_admin());

-- REFERRAL ATTRIBUTIONS POLICIES (Referrer can see own referral rows via RPC/policy; admins full access)
drop policy if exists "referral_attributions_select" on public.referral_attributions;
create policy "referral_attributions_select" on public.referral_attributions
  for select to authenticated
  using (referrer_id = auth.uid() or referred_user_id = auth.uid() or public.is_admin());

drop policy if exists "referral_attributions_admin_update" on public.referral_attributions;
create policy "referral_attributions_admin_update" on public.referral_attributions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- REWARD RULES POLICIES
drop policy if exists "reward_rules_select_all" on public.reward_rules;
create policy "reward_rules_select_all" on public.reward_rules
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "reward_rules_admin_write" on public.reward_rules;
create policy "reward_rules_admin_write" on public.reward_rules
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- RESOURCES POLICIES
-- Published metadata is readable so students see locked vs unlocked milestones,
-- while private downloads/content require qualifying referral count or admin role.
drop policy if exists "resources_select_published" on public.resources;
create policy "resources_select_published" on public.resources
  for select to anon, authenticated
  using ((is_published = true and is_archived = false) or public.is_admin());

drop policy if exists "resources_admin_write" on public.resources;
create policy "resources_admin_write" on public.resources
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- REWARD UNLOCKS POLICIES (Students can only read their own unlocks, never insert directly)
drop policy if exists "reward_unlocks_select_own" on public.reward_unlocks;
create policy "reward_unlocks_select_own" on public.reward_unlocks
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- RESOURCE ACCESS EVENTS POLICIES
drop policy if exists "resource_access_insert_own" on public.resource_access_events;
create policy "resource_access_insert_own" on public.resource_access_events
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "resource_access_select_own_or_admin" on public.resource_access_events;
create policy "resource_access_select_own_or_admin" on public.resource_access_events
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ATTENDANCE RECORDS POLICIES
drop policy if exists "attendance_select_own_or_admin" on public.attendance_records;
create policy "attendance_select_own_or_admin" on public.attendance_records
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "attendance_admin_write" on public.attendance_records;
create policy "attendance_admin_write" on public.attendance_records
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- PROJECT SUBMISSIONS POLICIES
drop policy if exists "projects_select_own_or_admin" on public.project_submissions;
create policy "projects_select_own_or_admin" on public.project_submissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "projects_insert_own" on public.project_submissions;
create policy "projects_insert_own" on public.project_submissions
  for insert to authenticated
  with check (user_id = auth.uid() and review_status = 'submitted');

drop policy if exists "projects_update_own_or_admin" on public.project_submissions;
create policy "projects_update_own_or_admin" on public.project_submissions
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin() or (user_id = auth.uid() and review_status = 'submitted')
  );

-- ADMIN AUDIT LOGS POLICIES (Only admins can read/insert; nobody can update/delete)
drop policy if exists "audit_logs_admin_select" on public.admin_audit_logs;
create policy "audit_logs_admin_select" on public.admin_audit_logs
  for select to authenticated
  using (public.is_admin());

drop policy if exists "audit_logs_admin_insert" on public.admin_audit_logs;
create policy "audit_logs_admin_insert" on public.admin_audit_logs
  for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 15. DEFAULT SEED CONFIGURATION (Settings & Resources Only — Zero Fake Users)
-- ----------------------------------------------------------------------------
insert into public.campaigns (
  slug,
  name,
  description,
  registration_goal,
  start_date,
  end_date,
  budget_cap_inr,
  actual_spend_inr,
  utm_campaign,
  channel_targets,
  budget_allocation,
  is_active
) values (
  'ai-project-60m-sprint',
  'Build Your First AI Project in 60 Minutes — 7-Day Campus Acquisition Campaign',
  'Acquire 500 final-year engineering student registrations within 7 days with a maximum campaign budget of ₹2,000.',
  500,
  current_date,
  (current_date + interval '7 days')::date,
  2000.00,
  0.00,
  'ai_project_60m',
  '{"college_clubs": 250, "whatsapp_communities": 150, "social_posts": 70, "referral_conversions": 30}'::jsonb,
  '{"paid_promotion_inr": 1000, "ambassador_materials_inr": 500, "contingency_inr": 500}'::jsonb,
  true
) on conflict (slug) do nothing;

insert into public.workshops (
  slug,
  title,
  subtitle,
  description,
  scheduled_at,
  timezone,
  duration_minutes,
  joining_url,
  agenda,
  preparation_checklist,
  is_published,
  project_submissions_enabled
) values (
  'build-first-ai-project-60m',
  'Build Your First AI Project in 60 Minutes',
  '60 Minutes. One AI Project. Your First Step.',
  'A guided, hands-on live technical workshop where final-year engineering students design, build, and deploy a working AI application with structured JSON outputs, error handling, and portfolio documentation.',
  null,
  'Asia/Kolkata (IST)',
  60,
  null,
  '[
    {"time": "00–10 min", "title": "Problem Scoping & Architecture", "detail": "Select a focused user problem, define inputs/outputs, and avoid generic chatbot wrappers."},
    {"time": "10–25 min", "title": "Zero-Cost LLM API & Structured Schema", "detail": "Configure environment variables, system instructions, and deterministic JSON output schemas."},
    {"time": "25–45 min", "title": "Frontend Integration & Guardrails", "detail": "Connect the Next.js UI to the server route with loading, validation, and fallback states."},
    {"time": "45–60 min", "title": "Live Deployment & Portfolio Packaging", "detail": "Deploy your build, write a clear architecture README, and submit your repository link."}
  ]'::jsonb,
  '[
    {"id": "node", "label": "Install Node.js 20+ and VS Code on your laptop"},
    {"id": "git", "label": "Ensure you have an active GitHub account for repository deployment"},
    {"id": "api", "label": "Review the Starter Kit guide for free-tier LLM API setup instructions"},
    {"id": "scope", "label": "Pick one beginner-friendly project problem statement before the session"}
  ]'::jsonb,
  true,
  true
) on conflict (slug) do nothing;

insert into public.reward_rules (slug, milestone_name, description, required_referrals, sort_order, is_active)
values
  ('tier-0-starter', 'AI Project Starter Kit', 'Unlocked immediately upon qualifying registration. Includes environment setup checklist and starter architecture.', 0, 1, true),
  ('tier-1-prompts', 'Prompt Pack and AI Tools Guide', 'Unlocked at 1 qualified referral. Structured JSON prompt templates, system guardrails, and free-tier AI tool directory.', 1, 2, true),
  ('tier-3-templates', 'Guided Project Templates', 'Unlocked at 3 qualified referrals. Step-by-step full-stack AI project blueprints and architecture diagrams.', 3, 3, true),
  ('tier-5-bundle', 'Advanced Learning Bundle', 'Unlocked at 5 qualified referrals. Deep-dive evaluation rubrics, portfolio README guide, and technical viva preparation notes.', 5, 4, true)
on conflict (slug) do nothing;

insert into public.resources (
  slug,
  title,
  description,
  resource_type,
  unlock_threshold,
  reward_rule_id,
  content_markdown,
  is_published,
  is_archived
)
select
  'ai-project-starter-kit',
  'AI Project Starter Kit',
  'Complete pre-workshop environment setup guide, free-tier API checklist, and 60-minute build roadmap.',
  'guide',
  0,
  rr.id,
  E'# AI Project Starter Kit (0 Referrals — Unlocked for All Registered Students)\n\n## 1. Recommended Free-Tier Stack\n- **Framework:** Next.js App Router + TypeScript\n- **LLM API:** Free-tier Gemini API (Google AI Studio) or compatible OpenAI-format endpoint\n- **Database & Auth:** Supabase PostgreSQL\n\n## 2. Pre-Workshop 10-Minute Setup Checklist\n1. Install Node.js 20 LTS (`node -v`)\n2. Create a clean GitHub repository for your workshop build\n3. Set `.env.local` with your API key (never commit `.env.local`)\n4. Test a single server-side API route returning JSON',
  true,
  false
from public.reward_rules rr where rr.slug = 'tier-0-starter'
on conflict (slug) do nothing;

insert into public.resources (
  slug,
  title,
  description,
  resource_type,
  unlock_threshold,
  reward_rule_id,
  content_markdown,
  is_published,
  is_archived
)
select
  'prompt-pack-ai-tools-guide',
  'Prompt Pack and AI Tools Guide',
  'Production system prompt patterns, deterministic JSON schema enforcement, and hallucination prevention checklist.',
  'prompt_pack',
  1,
  rr.id,
  E'# Prompt Pack & AI Tools Guide (1 Qualified Referral Milestone)\n\n## Deterministic JSON System Prompt Template\n```text\nYou are a structured analysis engine. Analyze the user input and respond ONLY with valid JSON matching this schema:\n{\n  "summary": "string (max 50 words)",\n  "score": 0,\n  "recommendations": ["string"],\n  "confidence": "high | medium | low"\n}\nDo not invent facts not present in the input. If context is insufficient, set confidence to "low".\n```\n\n## Guardrail Checklist\n- Always validate LLM JSON output with a schema parser before rendering\n- Set low temperature (0.1 - 0.3) for analytical tasks\n- Keep API keys strictly on the server',
  true,
  false
from public.reward_rules rr where rr.slug = 'tier-1-prompts'
on conflict (slug) do nothing;

insert into public.resources (
  slug,
  title,
  description,
  resource_type,
  unlock_threshold,
  reward_rule_id,
  content_markdown,
  is_published,
  is_archived
)
select
  'guided-project-templates',
  'Guided Project Templates',
  'Three modular 60-minute AI project blueprints with API route contracts, UI state flows, and test cases.',
  'template',
  3,
  rr.id,
  E'# Guided Project Templates (3 Qualified Referrals Milestone)\n\n## Blueprint A: Resume-to-Job-Description Gap Analyzer\n- **Input:** Candidate resume text + target role description\n- **Output Schema:** `matchScore`, `missingSkills[]`, `suggestedImprovements[]`\n\n## Blueprint B: Lecture Notes to Active-Recall Quiz Generator\n- **Input:** Study notes or syllabus section\n- **Output Schema:** `questions[{ prompt, options, correctIndex, explanation }]`\n\n## Blueprint C: Code Diff & Stack-Trace Diagnostic Helper\n- **Input:** Error log or code snippet\n- **Output Schema:** `rootCause`, `complexityNotes`, `suggestedFix`',
  true,
  false
from public.reward_rules rr where rr.slug = 'tier-3-templates'
on conflict (slug) do nothing;

insert into public.resources (
  slug,
  title,
  description,
  resource_type,
  unlock_threshold,
  reward_rule_id,
  content_markdown,
  is_published,
  is_archived
)
select
  'advanced-learning-bundle',
  'Advanced Learning Bundle',
  'Architecture documentation guide, prompt evaluation harness design, and technical interview defense notes.',
  'roadmap',
  5,
  rr.id,
  E'# Advanced Learning Bundle (5 Qualified Referrals Milestone)\n\n## 1. Writing an Engineering-Grade Project README\n- State the specific user problem and constraints\n- Include a request/response architecture flow diagram\n- Document how your app handles malformed model responses, timeouts, and rate limits\n\n## 2. Building a Prompt Evaluation Suite\n- Create 5 normal test cases, 3 edge cases (empty/long input), and 2 adversarial inputs\n- Assert schema validity and response latency across each run\n\n## 3. Discussing Your AI Project in Technical Interviews\n- Focus on schema validation, latency trade-offs, context scoping, and security boundaries rather than just UI styling.',
  true,
  false
from public.reward_rules rr where rr.slug = 'tier-5-bundle'
on conflict (slug) do nothing;

-- ============================================================================
-- ADMIN BOOTSTRAP PROCEDURE (Run manually in Supabase SQL Editor by owner)
-- ============================================================================
-- To promote a registered user to Administrator:
--   UPDATE public.profiles SET role = 'admin' WHERE lower(email) = 'admin@yourdomain.com';
--
-- To revoke Administrator privileges:
--   UPDATE public.profiles SET role = 'student' WHERE lower(email) = 'admin@yourdomain.com';
-- ============================================================================
