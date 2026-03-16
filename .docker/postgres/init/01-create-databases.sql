SELECT 'CREATE DATABASE observability'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'observability')\gexec
