-- KAÏRA FLOTTE — installation complète de la base de données (à coller UNE SEULE FOIS dans le SQL Editor de Supabase)

-- ===== 0001_schema.sql =====
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

-- ===== 0002_rls.sql =====
-- Kaïra Flotte — migration 0002 : sécurité (RLS) et journal d'audit
-- Principe : l'isolation est appliquée DANS la base, pas seulement dans l'interface.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_role_name() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.current_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('super_admin','fleet_manager') from public.profiles where id = auth.uid()), false)
$$;

create or replace function private.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false)
$$;

grant execute on all functions in schema private to authenticated;

alter table public.companies   enable row level security;
alter table public.profiles    enable row level security;
alter table public.drivers     enable row level security;
alter table public.vehicles    enable row level security;
alter table public.gps_devices enable row level security;
alter table public.positions   enable row level security;
alter table public.fuel_logs   enable row level security;
alter table public.missions    enable row level security;
alter table public.alerts      enable row level security;
alter table public.audit_logs  enable row level security;

-- Droits de base : tout passe ensuite par les politiques ci-dessous.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.companies, public.profiles, public.vehicles, public.fuel_logs,
                public.positions, public.alerts, public.drivers, public.missions,
                public.gps_devices, public.audit_logs to authenticated;
grant insert, update, delete on public.companies, public.vehicles, public.drivers,
                public.fuel_logs, public.missions, public.gps_devices to authenticated;
grant update (read_at) on public.alerts to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- companies
create policy companies_staff_all on public.companies for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy companies_client_read on public.companies for select to authenticated
  using (id = private.current_company_id());

-- profiles : chacun voit le sien ; le personnel voit tout ; un client_admin voit son entreprise
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_staff_read on public.profiles for select to authenticated
  using (private.is_staff());
create policy profiles_client_admin_read on public.profiles for select to authenticated
  using (private.current_role_name() = 'client_admin' and company_id = private.current_company_id());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- (changer un rôle ou une entreprise se fait côté serveur avec la clé de service uniquement)

-- Modules réservés au personnel Kaïra : aucun accès client
create policy drivers_staff_all on public.drivers for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy missions_staff_all on public.missions for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy gps_devices_staff_all on public.gps_devices for all to authenticated
  using (private.is_staff()) with check (private.is_staff());

-- Véhicules : gestion staff, lecture seule pour le client (ses propres véhicules)
create policy vehicles_staff_all on public.vehicles for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy vehicles_client_read on public.vehicles for select to authenticated
  using (company_id = private.current_company_id());

-- Carburant : gestion staff, lecture seule client
create policy fuel_staff_all on public.fuel_logs for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy fuel_client_read on public.fuel_logs for select to authenticated
  using (company_id = private.current_company_id());

-- Positions GPS : lecture seulement ; l'écriture passe par l'API de réception (clé de service)
create policy positions_staff_read on public.positions for select to authenticated
  using (private.is_staff());
create policy positions_client_read on public.positions for select to authenticated
  using (company_id = private.current_company_id());

-- Alertes
create policy alerts_staff_all on public.alerts for select to authenticated
  using (private.is_staff());
create policy alerts_client_read on public.alerts for select to authenticated
  using (company_id = private.current_company_id());
create policy alerts_staff_mark on public.alerts for update to authenticated
  using (private.is_staff() or company_id = private.current_company_id())
  with check (private.is_staff() or company_id = private.current_company_id());

-- Journal d'audit : lecture super_admin uniquement, écriture par déclencheur
create policy audit_super_admin_read on public.audit_logs for select to authenticated
  using (private.is_super_admin());

create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, action, table_name, record_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger audit_companies after insert or update or delete on public.companies
  for each row execute function private.audit();
create trigger audit_vehicles after insert or update or delete on public.vehicles
  for each row execute function private.audit();
create trigger audit_fuel_logs after insert or update or delete on public.fuel_logs
  for each row execute function private.audit();
create trigger audit_missions after insert or update or delete on public.missions
  for each row execute function private.audit();
create trigger audit_gps_devices after insert or update or delete on public.gps_devices
  for each row execute function private.audit();

-- ===== 0003_last_position_view.sql =====
-- Dernière position connue de chaque véhicule + état de connexion.
-- security_invoker = true : la vue applique les règles RLS de l'utilisateur (isolation conservée).
create view public.vehicle_last_position with (security_invoker = true) as
select distinct on (p.vehicle_id)
  p.vehicle_id, p.company_id, p.recorded_at, p.latitude, p.longitude, p.speed_kmh, p.heading_deg,
  case
    when p.recorded_at < now() - interval '10 minutes' then 'offline'
    when coalesce(p.speed_kmh, 0) > 3 then 'moving'
    else 'stopped'
  end as connection_state
from public.positions p
order by p.vehicle_id, p.recorded_at desc;
grant select on public.vehicle_last_position to authenticated;

-- ===== 0004_consistency.sql =====
-- Cohérence entre entreprises : impossible de mélanger les données de deux clients,
-- même par une erreur de formulaire ou un appel API direct.
create or replace function private.check_same_company() returns trigger
language plpgsql set search_path = public as $$
declare v_company uuid; d_company uuid;
begin
  if tg_table_name in ('fuel_logs','alerts','positions') then
    if new.vehicle_id is not null then
      select company_id into v_company from public.vehicles where id = new.vehicle_id;
      if v_company is distinct from new.company_id then
        raise exception 'Le véhicule n''appartient pas à cette entreprise';
      end if;
    end if;
  end if;
  if tg_table_name = 'vehicles' then
    if new.driver_id is not null then
      select company_id into d_company from public.drivers where id = new.driver_id;
      if d_company is distinct from new.company_id then
        raise exception 'Le chauffeur n''appartient pas à cette entreprise';
      end if;
    end if;
  end if;
  if tg_table_name = 'missions' then
    if new.vehicle_id is not null then
      select company_id into v_company from public.vehicles where id = new.vehicle_id;
      if v_company is distinct from new.company_id then raise exception 'Véhicule d''une autre entreprise'; end if;
    end if;
    if new.driver_id is not null then
      select company_id into d_company from public.drivers where id = new.driver_id;
      if d_company is distinct from new.company_id then raise exception 'Chauffeur d''une autre entreprise'; end if;
    end if;
  end if;
  return new;
end $$;

create trigger fuel_same_company before insert or update on public.fuel_logs
  for each row execute function private.check_same_company();
create trigger alerts_same_company before insert or update on public.alerts
  for each row execute function private.check_same_company();
create trigger positions_same_company before insert or update on public.positions
  for each row execute function private.check_same_company();
create trigger vehicles_same_company before insert or update on public.vehicles
  for each row execute function private.check_same_company();
create trigger missions_same_company before insert or update on public.missions
  for each row execute function private.check_same_company();

-- ===== 0005_service_role_grants.sql =====
-- L'API de réception GPS utilise la clé secrète (rôle service_role) : on lui donne explicitement les droits
-- nécessaires, sans dépendre des réglages par défaut du projet Supabase.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
