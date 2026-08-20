-- ============================================================================
-- DocDash — multi-tenant schema
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- Idempotent: safe to re-run.
--
-- Tenancy model: one tenant == one doctor == one row in public.doctors, whose
-- id IS the auth.users id. Every data table carries doctor_id and RLS keeps a
-- doctor inside their own rows. Edge Functions use the service role and must
-- therefore set doctor_id themselves (see supabase/functions/_shared/utils.ts).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------- doctors --
-- The tenant record and the doctor's professional profile in one row. Created
-- by the signup trigger below from the answers given on the sign-up form.
create table if not exists public.doctors (
  id                   uuid primary key references auth.users (id) on delete cascade,
  email                text,
  full_name            text not null default '',
  qualifications       text,          -- degrees, e.g. "MBBS, MD (General Medicine)"
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
  -- Dashboard theme: one brand colour and one surface colour, as #RRGGBB.
  -- Null means the default cream + bottle green. src/lib/theme.ts builds the
  -- full palette from these two.
  theme_primary        text,
  theme_background     text,
  n8n_webhook_url      text,
  -- Unique per doctor: it is what the Edge Functions use to tell tenants apart.
  n8n_api_key          text unique default encode(gen_random_bytes(24), 'hex'),
  created_at           timestamptz not null default now()
);

-- Re-running this file against a database that already has `doctors`:
-- `create table if not exists` above does nothing to an existing table, so
-- every column is topped up explicitly here. On a fresh install these all
-- no-op. Add new columns in BOTH places.
alter table public.doctors add column if not exists email                text;
alter table public.doctors add column if not exists full_name            text not null default '';
alter table public.doctors add column if not exists qualifications       text;
alter table public.doctors add column if not exists specialization       text;
alter table public.doctors add column if not exists registration_no      text;
alter table public.doctors add column if not exists years_experience     int;
alter table public.doctors add column if not exists phone                text;
alter table public.doctors add column if not exists clinic_name          text;
alter table public.doctors add column if not exists address              text;
alter table public.doctors add column if not exists logo_url             text;
alter table public.doctors add column if not exists signature_url        text;
alter table public.doctors add column if not exists default_meeting_link text;
alter table public.doctors add column if not exists working_hours        text;
alter table public.doctors add column if not exists theme_primary        text;
alter table public.doctors add column if not exists theme_background     text;
alter table public.doctors add column if not exists n8n_webhook_url      text;
alter table public.doctors add column if not exists n8n_api_key          text
  unique default encode(gen_random_bytes(24), 'hex');
alter table public.doctors add column if not exists created_at           timestamptz not null default now();

-- Any doctor who signed up before the key column existed still needs one.
update public.doctors
   set n8n_api_key = encode(gen_random_bytes(24), 'hex')
 where n8n_api_key is null;

-- PostgREST caches the schema; without this a new column is invisible to the
-- API until the next automatic reload.
notify pgrst, 'reload schema';


-- ---------------------------------------------------------------- patients --
create table if not exists public.patients (
  id                 uuid primary key default gen_random_uuid(),
  doctor_id          uuid not null default auth.uid() references public.doctors (id) on delete cascade,
  full_name          text not null,
  phone              text not null,
  age                int,
  gender             text,
  allergies          text,
  chronic_conditions text,
  source             text default 'whatsapp',
  created_at         timestamptz not null default now(),
  -- The same person may be a patient of two different doctors on this platform.
  unique (doctor_id, phone)
);

create index if not exists patients_doctor_idx    on public.patients (doctor_id);
create index if not exists patients_full_name_idx on public.patients (doctor_id, lower(full_name));
create index if not exists patients_phone_idx     on public.patients (doctor_id, phone);

-- ------------------------------------------------------------ appointments --
create table if not exists public.appointments (
  id             uuid primary key default gen_random_uuid(),
  doctor_id      uuid not null default auth.uid() references public.doctors (id) on delete cascade,
  patient_id     uuid not null references public.patients (id) on delete cascade,
  scheduled_at   timestamptz not null,
  reason         text,
  status         text not null default 'booked'
                 check (status in ('booked','in_progress','completed','cancelled','no_show')),
  meeting_link   text,
  n8n_booking_id text unique,
  created_at     timestamptz not null default now()
);

create index if not exists appointments_scheduled_at_idx on public.appointments (doctor_id, scheduled_at);
create index if not exists appointments_status_idx       on public.appointments (doctor_id, status);
create index if not exists appointments_patient_idx      on public.appointments (patient_id);

-- ----------------------------------------------------------- consultations --
create table if not exists public.consultations (
  id                      uuid primary key default gen_random_uuid(),
  doctor_id               uuid not null default auth.uid() references public.doctors (id) on delete cascade,
  appointment_id          uuid not null unique references public.appointments (id) on delete cascade,
  patient_id              uuid not null references public.patients (id) on delete cascade,
  diagnosis               text,
  advice                  text,
  follow_up_date          date,
  status                  text not null default 'draft' check (status in ('draft','completed')),
  prescription_pdf_url    text,
  whatsapp_delivery_status text check (whatsapp_delivery_status in ('pending','sent','failed')),
  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);

create index if not exists consultations_patient_idx on public.consultations (patient_id);
create index if not exists consultations_doctor_idx  on public.consultations (doctor_id);

-- ------------------------------------------------------ prescription_items --
create table if not exists public.prescription_items (
  id              uuid primary key default gen_random_uuid(),
  doctor_id       uuid not null default auth.uid() references public.doctors (id) on delete cascade,
  consultation_id uuid not null references public.consultations (id) on delete cascade,
  medicine_name   text not null,
  dosage          text,
  frequency       text,
  duration        text,
  instructions    text,
  sort_order      int not null default 0
);

create index if not exists prescription_items_consultation_idx
  on public.prescription_items (consultation_id, sort_order);

-- Powers the medicine autocomplete (§3.3) without a full table scan each keystroke.
create index if not exists prescription_items_medicine_idx
  on public.prescription_items (doctor_id, lower(medicine_name));

-- ============================================================================
-- Signup — materialise the doctor's profile from the sign-up form answers.
-- Runs as the definer so it can write the row before any session exists (the
-- account may still be awaiting email confirmation).
-- ============================================================================
create or replace function public.handle_new_doctor()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.doctors (
    id, email, full_name, qualifications, specialization, registration_no,
    years_experience, phone, clinic_name, address, working_hours
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(meta->>'full_name', ''), ''),
    nullif(meta->>'qualifications', ''),
    nullif(meta->>'specialization', ''),
    nullif(meta->>'registration_no', ''),
    nullif(meta->>'years_experience', '')::int,
    nullif(meta->>'phone', ''),
    nullif(meta->>'clinic_name', ''),
    nullif(meta->>'address', ''),
    nullif(meta->>'working_hours', '')
  )
  on conflict (id) do nothing;

  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_doctor();

-- ============================================================================
-- Row Level Security — a doctor only ever sees their own tenant's rows.
-- Edge Functions bypass this via the service role key.
-- ============================================================================
alter table public.doctors            enable row level security;
alter table public.patients           enable row level security;
alter table public.appointments       enable row level security;
alter table public.consultations      enable row level security;
alter table public.prescription_items enable row level security;

-- The doctor's own profile row. Insert is allowed so the onboarding screen can
-- create a profile for an account that predates the trigger.
drop policy if exists doctors_own_row on public.doctors;
create policy doctors_own_row on public.doctors
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

do $policies$
declare t text;
begin
  foreach t in array array[
    'patients','appointments','consultations','prescription_items'
  ] loop
    -- Drop the old single-tenant "everything to any authenticated user" policy.
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_own_tenant', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (doctor_id = auth.uid()) with check (doctor_id = auth.uid())',
      t || '_own_tenant', t
    );
  end loop;
end $policies$;

-- ============================================================================
-- Realtime — the dashboard subscribes to these for live booking pop-in (§3.1)
-- ============================================================================
alter table public.appointments  replica identity full;
alter table public.patients      replica identity full;
alter table public.consultations replica identity full;

do $pub$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $pub$;

do $pubtables$
declare t text;
begin
  foreach t in array array['appointments','patients','consultations'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $pubtables$;

-- ============================================================================
-- Storage buckets — prescription PDFs and clinic logo/signature.
-- Every object lives under a <doctor_id>/ prefix so writes can be tenant-scoped.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('clinic-assets', 'clinic-assets', true)
on conflict (id) do nothing;

-- Public read: the WhatsApp agent forwards the PDF link to the patient.
drop policy if exists "hakiman_buckets_public_read" on storage.objects;
drop policy if exists "docdash_buckets_public_read" on storage.objects;
create policy "docdash_buckets_public_read"
  on storage.objects for select to public
  using (bucket_id in ('prescriptions', 'clinic-assets'));

-- Writes only inside your own <doctor_id>/ folder.
drop policy if exists "hakiman_buckets_auth_write" on storage.objects;
drop policy if exists "docdash_buckets_own_folder_write" on storage.objects;
create policy "docdash_buckets_own_folder_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('prescriptions', 'clinic-assets')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "hakiman_buckets_auth_update" on storage.objects;
drop policy if exists "docdash_buckets_own_folder_update" on storage.objects;
create policy "docdash_buckets_own_folder_update"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('prescriptions', 'clinic-assets')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
