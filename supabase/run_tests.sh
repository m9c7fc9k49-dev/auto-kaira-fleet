#!/bin/bash
# Lance les tests de sécurité sur une base PostgreSQL locale jetable.
set -e
cd "$(dirname "$0")"
su postgres -c "psql -q -c 'drop database if exists kaira_test' -c 'create database kaira_test'"
for f in tests/00_supabase_shim.sql migrations/0001_schema.sql migrations/0002_rls.sql migrations/0003_last_position_view.sql migrations/0004_consistency.sql migrations/0005_service_role_grants.sql; do
  su postgres -c "psql -q -v ON_ERROR_STOP=1 -d kaira_test -f $PWD/$f" >/dev/null
done
su postgres -c "psql -v ON_ERROR_STOP=1 -d kaira_test -f $PWD/tests/01_rls_test.sql" | sed -n '/resultat/,$p'
