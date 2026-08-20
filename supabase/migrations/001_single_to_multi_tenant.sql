-- ============================================================================
-- Migration: single-tenant (Hakiman only) -> multi-tenant
--
-- Run this ONCE, on a database that already holds Hakiman's live data, BEFORE
-- running the new schema.sql. A brand-new project needs only schema.sql.
--
-- What it does:
--   1. creates public.doctors and gives Hakiman's existing auth user a profile,
--      seeded from the old clinic_settings singleton;
--   2. adds doctor_id to every data table and backfills it to that doctor;
--   3. drops clinic_settings.
--
-- Storage is left untouched: existing files keep their paths and public URLs,
-- and only new uploads go under <doctor_id>/.
--
-- HAKIMAN_USER_EMAIL below must match the auth user that Dr. Salim signs in
-- with. Everything already in the database becomes that account's tenant.
-- ============================================================================

create extension if not exists "pgcrypto";

do $migrate$
declare
  hakiman_email constant text := 'doctor@hakiman.clinic';  -- <<< EDIT ME
  hakiman_id    uuid;
  old_settings  record;
begin
  ------------------------------------------------------------------ doctors --
  create table if not exists public.doctors (
    id                   uuid primary key references auth.users (id) on delete cascade,
    email                text,
    full_name            text not null default '',
    qualifications       text,
    specialization       text,
    registration_no      text,
    years_experience     int,
    phone                text,
    clinic_name          text,
    address              text,
    logo_url             text,
    signature_url        text,
    default_meeting_link text,
    working_hours        text,
    theme_primary        text,
    theme_background     text,
    n8n_webhook_url      text,
    n8n_api_key          text unique default encode(gen_random_bytes(24), 'hex'),
    created_at           timestamptz not null default now()
  );

  -- Prefer the named account; fall back to the oldest user so a project whose
  -- login email differs from the constant above still migrates cleanly.
  select id into hakiman_id from auth.users where lower(email) = lower(hakiman_email);
  if hakiman_id is null then
    select id into hakiman_id from auth.users order by created_at limit 1;
  end if;

  if hakiman_id is null then
    raise exception
      'No auth user found. Create the doctor account first, then re-run this migration.';
  end if;

  select * into old_settings from public.clinic_settings where id = 1;

  insert into public.doctors (
    id, email, full_name, qualifications, registration_no, clinic_name,
    address, logo_url, signature_url, default_meeting_link, working_hours,
    n8n_webhook_url, n8n_api_key
  )
  select
    hakiman_id,
    (select email from auth.users where id = hakiman_id),
    coalesce(old_settings.doctor_name, 'Dr. Salim'),
    old_settings.qualifications,
    old_settings.registration_no,
    coalesce(old_settings.clinic_name, 'Hakiman Clinic'),
    old_settings.address,
    old_settings.logo_url,
    old_settings.signature_url,
    old_settings.default_meeting_link,
    old_settings.working_hours,
    old_settings.n8n_webhook_url,
    -- Keep the key already configured in n8n so the workflow keeps working.
    coalesce(nullif(old_settings.n8n_api_key, ''), encode(gen_random_bytes(24), 'hex'))
  on conflict (id) do nothing;

  --------------------------------------------------------- tenant columns --
  -- Added nullable, backfilled, then tightened, so existing rows survive.
  alter table public.patients           add column if not exists doctor_id uuid;
  alter table public.appointments       add column if not exists doctor_id uuid;
  alter table public.consultations      add column if not exists doctor_id uuid;
  alter table public.prescription_items add column if not exists doctor_id uuid;

  update public.patients           set doctor_id = hakiman_id where doctor_id is null;
  update public.appointments       set doctor_id = hakiman_id where doctor_id is null;
  update public.consultations      set doctor_id = hakiman_id where doctor_id is null;
  update public.prescription_items set doctor_id = hakiman_id where doctor_id is null;

  -- Storage is deliberately left alone. Files already uploaded keep their old
  -- root-level paths and their existing public URLs, which is what the stored
  -- prescription_pdf_url / logo_url values point at; only *new* uploads go
  -- under <doctor_id>/. Rewriting storage.objects.name here would rename the
  -- row without moving the object behind it and break every existing link.
end $migrate$;

-- ------------------------------------------------------ constraints & FKs --
-- Outside the DO block: these are plain DDL and read better unwrapped.
alter table public.patients           alter column doctor_id set not null;
alter table public.appointments       alter column doctor_id set not null;
alter table public.consultations      alter column doctor_id set not null;
alter table public.prescription_items alter column doctor_id set not null;

alter table public.patients           alter column doctor_id set default auth.uid();
alter table public.appointments       alter column doctor_id set default auth.uid();
alter table public.consultations      alter column doctor_id set default auth.uid();
alter table public.prescription_items alter column doctor_id set default auth.uid();

do $fks$
declare t text;
begin
  foreach t in array array[
    'patients','appointments','consultations','prescription_items'
  ] loop
    if not exists (
      select 1 from pg_constraint
      where conname = t || '_doctor_id_fkey' and conrelid = ('public.' || t)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I
           foreign key (doctor_id) references public.doctors (id) on delete cascade',
        t, t || '_doctor_id_fkey'
      );
    end if;
  end loop;
end $fks$;

-- Phone is unique per doctor now, not globally.
alter table public.patients drop constraint if exists patients_phone_key;
do $uniq$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'patients_doctor_id_phone_key' and conrelid = 'public.patients'::regclass
  ) then
    alter table public.patients add constraint patients_doctor_id_phone_key unique (doctor_id, phone);
  end if;
end $uniq$;

-- clinic_settings has been folded into doctors.
drop table if exists public.clinic_settings;

-- Now run schema.sql to install the trigger, RLS policies and new indexes.
