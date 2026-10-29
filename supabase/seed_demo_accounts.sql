-- ============================================================================
-- GrowthOS — Instant Pre-Verified Demo Admin & Student Account Seeder
-- Run this in Supabase Dashboard -> SQL Editor if you want ready-to-use
-- login credentials without waiting for email confirmation emails.
--
-- Credentials created by this script:
--   1. Admin Account:
--      Email:    growthos.admin@gmail.com
--      Password: GrowthOS2026!
--      Role:     admin (Full access to /admin and /dashboard)
--
--   2. Student Account:
--      Email:    growthos.student@gmail.com
--      Password: GrowthOS2026!
--      Role:     student (Access to /dashboard)
-- ============================================================================

create extension if not exists pgcrypto;

do $$
declare
  admin_uid uuid := '11111111-1111-4111-8111-111111111111';
  student_uid uuid := '22222222-2222-4222-8222-222222222222';
begin
  -- 1. Create pre-confirmed Admin user in auth.users if not exists
  if not exists (select 1 from auth.users where email = 'growthos.admin@gmail.com') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_uid,
      'authenticated',
      'authenticated',
      'growthos.admin@gmail.com',
      crypt('GrowthOS2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"GrowthOS Admin","college":"NxtWave Workshop Team","graduation_year":"2026","acquisition_source":"Direct / Landing Page"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      admin_uid,
      admin_uid::text,
      format('{"sub":"%s","email":"growthos.admin@gmail.com","email_verified":true}', admin_uid)::jsonb,
      'email',
      now(),
      now(),
      now()
    ) on conflict do nothing;
  end if;

  -- Promote growthos.admin@gmail.com to 'admin' role in public.profiles
  update public.profiles
  set role = 'admin',
      email_verified = true,
      updated_at = now()
  where lower(email) = 'growthos.admin@gmail.com';

  -- 2. Create pre-confirmed Student user in auth.users if not exists
  if not exists (select 1 from auth.users where email = 'growthos.student@gmail.com') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      student_uid,
      'authenticated',
      'authenticated',
      'growthos.student@gmail.com',
      crypt('GrowthOS2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Aarav Reddy","college":"JNTU Hyderabad","graduation_year":"2026","acquisition_source":"College club / CR ambassador"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      student_uid,
      student_uid::text,
      format('{"sub":"%s","email":"growthos.student@gmail.com","email_verified":true}', student_uid)::jsonb,
      'email',
      now(),
      now(),
      now()
    ) on conflict do nothing;
  end if;
end;
$$;

