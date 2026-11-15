-- Kaïra Flotte — migration 0001 : schéma de base
-- Fuseau horaire d'affichage : Africa/Bamako (les dates sont stockées en UTC).

create type public.user_role as enum ('super_admin','fleet_manager','client_admin','client_user');
create type public.company_status as enum ('active','suspended','disabled');
create type public.vehicle_status as enum ('available','on_mission','immobilized','maintenance','archived');
create type public.mission_status as enum ('planned','in_progress','delivered','cancelled');
create type public.alert_type as enum ('offline','geofence_enter','geofence_exit','overspeed','incident','delay','abnormal_fuel','maintenance_due','document_expiring');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  contact_name text,
  phone text,
  email text,
  address text,
  status public.company_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete restrict,
  role public.user_role not null default 'client_user',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  -- le personnel Kaïra n'appartient à aucune entreprise cliente ; un client en a toujours une
  constraint profiles_company_matches_role check (
    (role in ('super_admin','fleet_manager') and company_id is null)
    or (role in ('client_admin','client_user') and company_id is not null)
  )
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  first_name text not null,
  last_name text not null,
  phone text,
  address text,
  license_number text,
  license_expires_on date,
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  plate text not null,
  brand text,
  model text,
  vehicle_type text,
  capacity_kg numeric check (capacity_kg is null or capacity_kg >= 0),
  chassis_number text,
  driver_id uuid references public.drivers(id) on delete set null,
  status public.vehicle_status not null default 'available',
  created_at timestamptz not null default now(),
  unique (company_id, plate)
);

create table public.gps_devices (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  imei text not null unique,
  label text,
  -- le jeton n'est JAMAIS stocké en clair : seulement son empreinte SHA-256
  token_hash text not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.positions (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  device_id uuid references public.gps_devices(id) on delete set null,
  recorded_at timestamptz not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  speed_kmh numeric check (speed_kmh is null or speed_kmh >= 0),
  heading_deg numeric check (heading_deg is null or heading_deg between 0 and 360),
  received_at timestamptz not null default now()
);
create index positions_vehicle_time_idx on public.positions (vehicle_id, recorded_at desc);
create index positions_company_idx on public.positions (company_id);

create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  filled_on date not null,
  liters numeric not null check (liters > 0),
  unit_price_fcfa numeric not null check (unit_price_fcfa >= 0),
  odometer_km numeric check (odometer_km is null or odometer_km >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  origin text not null,
  destination text not null,
  cargo text,
  status public.mission_status not null default 'planned',
  planned_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  type public.alert_type not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
