\set ON_ERROR_STOP on
-- Données de test (créées en superutilisateur)
insert into public.companies(id,name) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Transport A'),
 ('bbbbbbbb-0000-0000-0000-000000000002','Transport B');
insert into auth.users(id,email) values
 ('11111111-0000-0000-0000-000000000001','super@kaira.test'),
 ('22222222-0000-0000-0000-000000000002','manager@kaira.test'),
 ('33333333-0000-0000-0000-000000000003','adminA@a.test'),
 ('44444444-0000-0000-0000-000000000004','userB@b.test');
insert into public.profiles(id,company_id,role) values
 ('11111111-0000-0000-0000-000000000001',null,'super_admin'),
 ('22222222-0000-0000-0000-000000000002',null,'fleet_manager'),
 ('33333333-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','client_admin'),
 ('44444444-0000-0000-0000-000000000004','bbbbbbbb-0000-0000-0000-000000000002','client_user');
insert into public.vehicles(id,company_id,plate) values
 ('a1000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','BKO-A-1'),
 ('b1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','BKO-B-1');
insert into public.drivers(company_id,first_name,last_name) values ('aaaaaaaa-0000-0000-0000-000000000001','Ali','Traoré');
insert into public.missions(company_id,origin,destination) values ('aaaaaaaa-0000-0000-0000-000000000001','Bamako','Ségou');
insert into public.fuel_logs(company_id,vehicle_id,filled_on,liters,unit_price_fcfa) values
 ('aaaaaaaa-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','2026-11-01',100,700),
 ('bbbbbbbb-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','2026-11-01',80,700);
insert into public.positions(vehicle_id,company_id,recorded_at,latitude,longitude) values
 ('a1000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',now(),12.63,-8.0),
 ('b1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002',now(),12.64,-8.1);

create temp table results(name text, ok boolean);
grant all on results to authenticated;

create function pg_temp.check(name text, ok boolean) returns void language sql as
$$ insert into results values (name, ok) $$;

-- Aide : exécute une requête de comptage comme un utilisateur donné
create function pg_temp.count_as(uid uuid, q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  execute q into n;
  reset role;
  return n;
end $$;

-- Aide : tente une écriture comme un utilisateur ; renvoie true si refusée/sans effet
create function pg_temp.write_blocked(uid uuid, q text) returns boolean language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  begin
    execute q; get diagnostics n = row_count;
    reset role;
    return n = 0;
  exception when others then
    reset role; return true;
  end;
end $$;

select pg_temp.check('client A voit 1 seul véhicule (le sien)', pg_temp.count_as('33333333-0000-0000-0000-000000000003','select count(*) from public.vehicles')=1);
select pg_temp.check('client B ne voit pas les véhicules de A', pg_temp.count_as('44444444-0000-0000-0000-000000000004',$$select count(*) from public.vehicles where company_id='aaaaaaaa-0000-0000-0000-000000000001'$$)=0);
select pg_temp.check('client A ne voit que son carburant', pg_temp.count_as('33333333-0000-0000-0000-000000000003','select count(*) from public.fuel_logs')=1);
select pg_temp.check('client A ne voit que ses positions', pg_temp.count_as('33333333-0000-0000-0000-000000000003','select count(*) from public.positions')=1);
select pg_temp.check('client A ne voit aucun chauffeur', pg_temp.count_as('33333333-0000-0000-0000-000000000003','select count(*) from public.drivers')=0);
select pg_temp.check('client A ne voit aucune mission', pg_temp.count_as('33333333-0000-0000-0000-000000000003','select count(*) from public.missions')=0);
select pg_temp.check('client A ne voit que sa propre entreprise', pg_temp.count_as('33333333-0000-0000-0000-000000000003','select count(*) from public.companies')=1);
select pg_temp.check('client A ne voit pas les profils de B', pg_temp.count_as('33333333-0000-0000-0000-000000000003','select count(*) from public.profiles')=1);
select pg_temp.check('client A ne peut pas lire les journaux d''audit', pg_temp.count_as('33333333-0000-0000-0000-000000000003','select count(*) from public.audit_logs')=0);
select pg_temp.check('client A ne peut pas modifier le carburant', pg_temp.write_blocked('33333333-0000-0000-0000-000000000003','update public.fuel_logs set liters=1'));
select pg_temp.check('client A ne peut pas créer de véhicule', pg_temp.write_blocked('33333333-0000-0000-0000-000000000003',$$insert into public.vehicles(company_id,plate) values ('aaaaaaaa-0000-0000-0000-000000000001','HACK')$$));
select pg_temp.check('client A ne peut pas créer de mission', pg_temp.write_blocked('33333333-0000-0000-0000-000000000003',$$insert into public.missions(company_id,origin,destination) values ('aaaaaaaa-0000-0000-0000-000000000001','x','y')$$));
select pg_temp.check('client A ne peut pas écrire de position GPS', pg_temp.write_blocked('33333333-0000-0000-0000-000000000003',$$insert into public.positions(vehicle_id,company_id,recorded_at,latitude,longitude) values ('a1000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',now(),0,0)$$));
select pg_temp.check('client A ne peut pas s''octroyer le rôle super_admin', pg_temp.write_blocked('33333333-0000-0000-0000-000000000003',$$update public.profiles set role='super_admin' where id='33333333-0000-0000-0000-000000000003'$$));
select pg_temp.check('client A ne peut pas changer d''entreprise', pg_temp.write_blocked('33333333-0000-0000-0000-000000000003',$$update public.profiles set company_id='bbbbbbbb-0000-0000-0000-000000000002' where id='33333333-0000-0000-0000-000000000003'$$));
select pg_temp.check('gestionnaire voit les 2 véhicules', pg_temp.count_as('22222222-0000-0000-0000-000000000002','select count(*) from public.vehicles')=2);
select pg_temp.check('gestionnaire voit le carburant des 2 clients', pg_temp.count_as('22222222-0000-0000-0000-000000000002','select count(*) from public.fuel_logs')=2);
select pg_temp.check('gestionnaire voit les missions', pg_temp.count_as('22222222-0000-0000-0000-000000000002','select count(*) from public.missions')=1);
select pg_temp.check('gestionnaire ne lit pas le journal d''audit', pg_temp.count_as('22222222-0000-0000-0000-000000000002','select count(*) from public.audit_logs')=0);
select pg_temp.check('super_admin lit le journal d''audit', pg_temp.count_as('11111111-0000-0000-0000-000000000001','select count(*) from public.audit_logs')>0);
select pg_temp.check('gestionnaire peut ajouter un plein de carburant', not pg_temp.write_blocked('22222222-0000-0000-0000-000000000002',$$insert into public.fuel_logs(company_id,vehicle_id,filled_on,liters,unit_price_fcfa) values ('aaaaaaaa-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','2026-11-02',50,700)$$));
select pg_temp.check('utilisateur anonyme/sans profil ne voit rien', pg_temp.count_as('99999999-0000-0000-0000-000000000009','select count(*) from public.vehicles')=0);
select pg_temp.check('vue dernière position : client A voit 1 ligne', pg_temp.count_as('33333333-0000-0000-0000-000000000003','select count(*) from public.vehicle_last_position')=1);
select pg_temp.check('vue dernière position : gestionnaire voit 2 lignes', pg_temp.count_as('22222222-0000-0000-0000-000000000002','select count(*) from public.vehicle_last_position')=2);
select pg_temp.check('vue dernière position : client B ne voit pas A', pg_temp.count_as('44444444-0000-0000-0000-000000000004',$$select count(*) from public.vehicle_last_position where company_id='aaaaaaaa-0000-0000-0000-000000000001'$$)=0);
select pg_temp.check('position récente = état moving/stopped (pas offline)', (select connection_state from public.vehicle_last_position where vehicle_id='a1000000-0000-0000-0000-000000000001') = 'stopped');

select pg_temp.check('cohérence : plein A sur véhicule de B refusé', pg_temp.write_blocked('22222222-0000-0000-0000-000000000002',$$insert into public.fuel_logs(company_id,vehicle_id,filled_on,liters,unit_price_fcfa) values ('aaaaaaaa-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','2026-11-03',10,700)$$));
select pg_temp.check('cohérence : mission A avec véhicule de B refusée', pg_temp.write_blocked('22222222-0000-0000-0000-000000000002',$$insert into public.missions(company_id,vehicle_id,origin,destination) values ('aaaaaaaa-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','x','y')$$));
select pg_temp.check('cohérence : plein A sur véhicule de A accepté', not pg_temp.write_blocked('22222222-0000-0000-0000-000000000002',$$insert into public.fuel_logs(company_id,vehicle_id,filled_on,liters,unit_price_fcfa) values ('aaaaaaaa-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','2026-11-03',10,700)$$));

do $$ begin
  begin
    insert into public.profiles(id,company_id,role) values (gen_random_uuid(), null, 'client_user');
    insert into results values ('contrainte : client sans entreprise refusé', false);
  exception when others then
    insert into results values ('contrainte : client sans entreprise refusé', true);
  end;
end $$;

select case when ok then 'OK  ' else 'ÉCHEC' end || ' — ' || name as resultat from results order by ok, name;
select count(*) filter (where ok) as reussis, count(*) filter (where not ok) as echoues from results;
