-- 18: the admin can set how long exam camera/microphone captures are kept. Run once after 17 (safe to re-run).
alter table site_settings drop constraint if exists site_settings_key_check;
alter table site_settings add constraint site_settings_key_check check (key in ('hr', 'workspace', 'event', 'notify_mode', 'proof_retention'));
-- passDays: delete a student's captures this many days after they PASS (0 = at the next clean-up). maxDays: delete every capture after this many days.
insert into site_settings (key, value) values ('proof_retention', '{"passDays": 7, "maxDays": 30}'::jsonb) on conflict (key) do nothing;
