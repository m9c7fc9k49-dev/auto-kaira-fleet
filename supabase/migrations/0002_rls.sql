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
