-- Asegúrate de que la extensión pg_net esté habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programa la ejecución todos los días a las 8:00 AM
SELECT cron.schedule(
  'sync-bcv-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
      url:='https://gqlhillifpxizbaqaagl.supabase.co/functions/v1/sync-tasa-bcv',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || (SELECT current_setting('request.jwt.claim.role', true)) || '"}'::jsonb
  )
  $$
);
