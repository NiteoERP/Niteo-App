-- 1. Limpiar jobs anteriores
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-bcv-daily') THEN
    PERFORM cron.unschedule('sync-bcv-daily');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-bcv-rates') THEN
    PERFORM cron.unschedule('sync-bcv-rates');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-bcv-cierre') THEN
    PERFORM cron.unschedule('sync-bcv-cierre');
  END IF;
END $$;

-- 2. Asegurar extensiones
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Programar la sincronización automática de la tasa BCV
-- Horarios en UTC (Venezuela es UTC-4):
-- 11:00 UTC = 7:00 AM VET
-- 13:00 UTC = 9:00 AM VET (Apertura bancaria)
-- 15:00 UTC = 11:00 AM VET
-- 17:00 UTC = 1:00 PM VET
-- 19:00 UTC = 3:00 PM VET
SELECT cron.schedule(
  'sync-bcv-rates',
  '0 11,13,15,17,19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gqlhillifpxizbaqaagl.supabase.co/functions/v1/sync-tasa-bcv',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('trigger', 'pg_cron')
  );
  $$
);

-- 21:30 UTC = 5:30 PM VET (Publicación oficial de cierre BCV para el día siguiente)
SELECT cron.schedule(
  'sync-bcv-cierre',
  '30 21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gqlhillifpxizbaqaagl.supabase.co/functions/v1/sync-tasa-bcv',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('trigger', 'pg_cron_cierre')
  );
  $$
);
