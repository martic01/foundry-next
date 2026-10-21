-- The name a student types before registering: it is the name printed on
-- their certificate. Run after migration-certificates.sql.
alter table profiles add column if not exists certificate_name text
  check (certificate_name is null or char_length(certificate_name) between 2 and 100);
