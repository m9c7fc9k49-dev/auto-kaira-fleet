-- À exécuter APRÈS avoir créé votre utilisateur dans Supabase (Authentication > Users > Add user).
-- Remplacez UNIQUEMENT l'adresse e-mail ci-dessous par la vôtre (gardez les guillemets simples).
insert into public.profiles (id, role, full_name)
select id, 'super_admin', 'Administrateur Kaïra'
from auth.users
where email = 'VOTRE-EMAIL@exemple.com';
