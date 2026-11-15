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
