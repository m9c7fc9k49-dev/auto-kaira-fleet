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
