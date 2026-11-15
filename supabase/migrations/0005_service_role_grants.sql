-- L'API de réception GPS utilise la clé secrète (rôle service_role) : on lui donne explicitement les droits
-- nécessaires, sans dépendre des réglages par défaut du projet Supabase.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
