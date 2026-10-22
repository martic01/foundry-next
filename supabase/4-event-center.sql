-- STEP 4 (newest). Contact details for the Event Center section (Admin -> HR, workspace & events).
-- Safe to re-run. Only run this if you already ran 3-pricing-and-contacts.sql.

alter table site_settings drop constraint if exists site_settings_key_check;
alter table site_settings
  add constraint site_settings_key_check check (key in ('hr', 'workspace', 'event'));

insert into site_settings (key, value) values
  ('event', '{"whatsapp":"08027245572","email":"olufunmione@gmail.com","address":"Yaya Abatan Road, Ogba, Lagos"}')
on conflict (key) do nothing;
