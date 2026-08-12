-- ============================================================================
-- Hakiman — DocDash schema (PRD §5)
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- Idempotent: safe to re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- patients --
create table if not exists public.patients (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  phone              text not null unique,
  age                int,
  gender             text,
  allergies          text,
  chronic_conditions text,
  source             text default 'whatsapp',
  created_at         timestamptz not null default now()
);

create index if not exists patients_full_name_idx on public.patients (lower(full_name));
create index if not exists patients_phone_idx     on public.patients (phone);

-- ------------------------------------------------------------ appointments --
create table if not exists public.appointments (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients (id) on delete cascade,
  scheduled_at   timestamptz not null,
  reason         text,
  status         text not null default 'booked'
                 check (status in ('booked','in_progress','completed','cancelled','no_show')),
  meeting_link   text,
  n8n_booking_id text unique,
  created_at     timestamptz not null default now()
);

create index if not exists appointments_scheduled_at_idx on public.appointments (scheduled_at);
create index if not exists appointments_status_idx       on public.appointments (status);
create index if not exists appointments_patient_idx      on public.appointments (patient_id);

-- ----------------------------------------------------------- consultations --
create table if not exists public.consultations (
  id                      uuid primary key default gen_random_uuid(),
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

-- ------------------------------------------------------ prescription_items --
create table if not exists public.prescription_items (
  id              uuid primary key default gen_random_uuid(),
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
  on public.prescription_items (lower(medicine_name));

-- --------------------------------------------------------- clinic_settings --
create table if not exists public.clinic_settings (
  id                   int primary key default 1 check (id = 1),
  clinic_name          text,
  doctor_name          text,
  qualifications       text,
  registration_no      text,
  address              text,
  logo_url             text,
  signature_url        text,
  default_meeting_link text,
  working_hours        text,
  n8n_webhook_url      text,
  n8n_api_key          text
);

-- Singleton row so the Settings screen always has something to edit.
insert into public.clinic_settings (id, clinic_name, doctor_name, working_hours)
values (1, 'Hakiman Clinic', 'Dr. Salim', 'Mon–Sat, 10:00 AM – 6:00 PM')
on conflict (id) do nothing;

-- ============================================================================
-- Row Level Security — everything is readable/writable only by the
-- authenticated doctor. Edge Functions bypass this via the service role key.
-- ============================================================================
alter table public.patients           enable row level security;
alter table public.appointments       enable row level security;
alter table public.consultations      enable row level security;
alter table public.prescription_items enable row level security;
alter table public.clinic_settings    enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'patients','appointments','consultations','prescription_items','clinic_settings'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated_all', t
    );
  end loop;
end $$;

-- ============================================================================
-- Realtime — the dashboard subscribes to these for live booking pop-in (§3.1)
-- ============================================================================
alter table public.appointments  replica identity full;
alter table public.patients      replica identity full;
alter table public.consultations replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
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
end $$;

-- ============================================================================
-- Storage buckets — prescription PDFs and clinic logo/signature
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('clinic-assets', 'clinic-assets', true)
on conflict (id) do nothing;

-- Public read (the WhatsApp agent forwards the PDF link); writes require auth.
drop policy if exists "hakiman_buckets_public_read" on storage.objects;
create policy "hakiman_buckets_public_read"
  on storage.objects for select to public
  using (bucket_id in ('prescriptions', 'clinic-assets'));

drop policy if exists "hakiman_buckets_auth_write" on storage.objects;
create policy "hakiman_buckets_auth_write"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('prescriptions', 'clinic-assets'));

drop policy if exists "hakiman_buckets_auth_update" on storage.objects;
create policy "hakiman_buckets_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id in ('prescriptions', 'clinic-assets'));
