#!/bin/bash
# Runs during first init of the PostgreSQL container
# Changes password_encryption to md5 so Prisma on Windows can connect

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  ALTER SYSTEM SET password_encryption = 'md5';
  SELECT pg_reload_conf();
  ALTER USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';
EOSQL
