-- ROLLBACK: Drop every permissive anon policy. Restores full RLS lockdown.

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

DROP POLICY IF EXISTS "lesson_applications_anon_select" ON lesson_applications;
DROP POLICY IF EXISTS "lesson_applications_anon_insert" ON lesson_applications;
DROP POLICY IF EXISTS "lesson_applications_anon_update" ON lesson_applications;
DROP POLICY IF EXISTS "lesson_applications_anon_delete" ON lesson_applications;

DROP POLICY IF EXISTS "time_slots_anon_select" ON time_slots;
DROP POLICY IF EXISTS "time_slots_anon_insert" ON time_slots;
DROP POLICY IF EXISTS "time_slots_anon_update" ON time_slots;
DROP POLICY IF EXISTS "time_slots_anon_delete" ON time_slots;

DROP POLICY IF EXISTS "reservations_anon_select" ON reservations;
DROP POLICY IF EXISTS "reservations_anon_insert" ON reservations;
DROP POLICY IF EXISTS "reservations_anon_update" ON reservations;
DROP POLICY IF EXISTS "reservations_anon_delete" ON reservations;

DROP POLICY IF EXISTS "extensions_anon_select" ON extensions;
DROP POLICY IF EXISTS "extensions_anon_insert" ON extensions;
DROP POLICY IF EXISTS "extensions_anon_update" ON extensions;
DROP POLICY IF EXISTS "extensions_anon_delete" ON extensions;

DROP POLICY IF EXISTS "points_history_anon_select" ON points_history;
DROP POLICY IF EXISTS "points_history_anon_insert" ON points_history;
DROP POLICY IF EXISTS "points_history_anon_update" ON points_history;
DROP POLICY IF EXISTS "points_history_anon_delete" ON points_history;

DROP POLICY IF EXISTS "ranking_backup_anon_select" ON ranking_backup;
DROP POLICY IF EXISTS "ranking_backup_anon_insert" ON ranking_backup;
DROP POLICY IF EXISTS "ranking_backup_anon_update" ON ranking_backup;
DROP POLICY IF EXISTS "ranking_backup_anon_delete" ON ranking_backup;

DROP POLICY IF EXISTS "notifications_anon_select" ON notifications;
DROP POLICY IF EXISTS "notifications_anon_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_anon_update" ON notifications;
DROP POLICY IF EXISTS "notifications_anon_delete" ON notifications;

DROP POLICY IF EXISTS "platform_config_anon_select" ON platform_config;
DROP POLICY IF EXISTS "platform_config_anon_insert" ON platform_config;
DROP POLICY IF EXISTS "platform_config_anon_update" ON platform_config;
DROP POLICY IF EXISTS "platform_config_anon_delete" ON platform_config;

DROP POLICY IF EXISTS "products_anon_select" ON products;
DROP POLICY IF EXISTS "products_anon_insert" ON products;
DROP POLICY IF EXISTS "products_anon_update" ON products;
DROP POLICY IF EXISTS "products_anon_delete" ON products;

DROP POLICY IF EXISTS "registrations_anon_select" ON registrations;
DROP POLICY IF EXISTS "registrations_anon_insert" ON registrations;
DROP POLICY IF EXISTS "registrations_anon_update" ON registrations;
DROP POLICY IF EXISTS "registrations_anon_delete" ON registrations;

DROP POLICY IF EXISTS "project_works_anon_select" ON project_works;
DROP POLICY IF EXISTS "project_works_anon_insert" ON project_works;
DROP POLICY IF EXISTS "project_works_anon_update" ON project_works;
DROP POLICY IF EXISTS "project_works_anon_delete" ON project_works;

DROP POLICY IF EXISTS "weekly_templates_anon_select" ON weekly_templates;
DROP POLICY IF EXISTS "weekly_templates_anon_insert" ON weekly_templates;
DROP POLICY IF EXISTS "weekly_templates_anon_update" ON weekly_templates;
DROP POLICY IF EXISTS "weekly_templates_anon_delete" ON weekly_templates;

DROP POLICY IF EXISTS "reward_transactions_anon_select" ON reward_transactions;
DROP POLICY IF EXISTS "reward_transactions_anon_insert" ON reward_transactions;
DROP POLICY IF EXISTS "reward_transactions_anon_update" ON reward_transactions;
DROP POLICY IF EXISTS "reward_transactions_anon_delete" ON reward_transactions;

DROP POLICY IF EXISTS "financial_events_anon_select" ON financial_events;
DROP POLICY IF EXISTS "financial_events_anon_insert" ON financial_events;
DROP POLICY IF EXISTS "financial_events_anon_update" ON financial_events;
DROP POLICY IF EXISTS "financial_events_anon_delete" ON financial_events;

DROP POLICY IF EXISTS "studio_env_anon_select" ON studio_env;
DROP POLICY IF EXISTS "studio_env_anon_insert" ON studio_env;
DROP POLICY IF EXISTS "studio_env_anon_update" ON studio_env;
DROP POLICY IF EXISTS "studio_env_anon_delete" ON studio_env;

DROP POLICY IF EXISTS "studio_playlists_anon_select" ON studio_playlists;
DROP POLICY IF EXISTS "studio_playlists_anon_insert" ON studio_playlists;
DROP POLICY IF EXISTS "studio_playlists_anon_update" ON studio_playlists;
DROP POLICY IF EXISTS "studio_playlists_anon_delete" ON studio_playlists;

DROP POLICY IF EXISTS "task_assignments_anon_select" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_anon_insert" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_anon_update" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_anon_delete" ON task_assignments;

DROP POLICY IF EXISTS "game_point_logs_anon_select" ON game_point_logs;
DROP POLICY IF EXISTS "game_point_logs_anon_insert" ON game_point_logs;
DROP POLICY IF EXISTS "game_point_logs_anon_update" ON game_point_logs;
DROP POLICY IF EXISTS "game_point_logs_anon_delete" ON game_point_logs;

DROP POLICY IF EXISTS "admin_settings_anon_select" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_anon_insert" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_anon_update" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_anon_delete" ON admin_settings;
