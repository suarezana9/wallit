-- Fase 7: columnas de notificaciones push en users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_token       text,
  ADD COLUMN IF NOT EXISTS notif_config     jsonb DEFAULT '{"sin_actividad":true,"inicio_mes":true,"cierre_mes":true,"gasto_grupo":true,"balance_negativo":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS notif_enviadas   jsonb DEFAULT '{}'::jsonb;

-- Índice para la Edge Function (buscar usuarios con push_token)
CREATE INDEX IF NOT EXISTS idx_users_push_token ON public.users (push_token)
  WHERE push_token IS NOT NULL;

-- ─── Cron: llamar la Edge Function todos los días a las 9am Argentina (12pm UTC) ───
-- Requiere la extensión pg_cron y pg_net (habilitadas en Supabase por defecto).
-- Reemplazá [PROJECT_REF] y [ANON_KEY] con tus valores del dashboard.
--
-- select cron.schedule(
--   'notificaciones-diarias',
--   '0 12 * * *',
--   $$
--   select net.http_post(
--     url    := 'https://[PROJECT_REF].supabase.co/functions/v1/enviar-notificaciones',
--     headers := jsonb_build_object(
--       'Content-Type',  'application/json',
--       'Authorization', 'Bearer [ANON_KEY]'
--     ),
--     body   := '{}'::jsonb
--   );
--   $$
-- );
--
-- Para verificar que el cron está activo:
--   select * from cron.job;
--
-- Para cancelarlo:
--   select cron.unschedule('notificaciones-diarias');
