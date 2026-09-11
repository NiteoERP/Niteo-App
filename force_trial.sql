-- =============================================================================
-- FIX: FORZAR MODO TRIAL PARA EMPRESAS SIN PAGAR
-- =============================================================================

-- 1. Actualizar todas las empresas a 'TRIAL' si NO son 'LIFETIME'
UPDATE public.empresas
SET estado = 'TRIAL'
WHERE plan_suscripcion != 'LIFETIME' OR plan_suscripcion IS NULL;

-- 2. Asegurarse de que el valor por defecto para nuevas empresas sea 'TRIAL'
ALTER TABLE public.empresas ALTER COLUMN estado SET DEFAULT 'TRIAL'::estado_suscripcion;

-- 3. Asegurarse de que el plan por defecto para nuevas empresas sea 'STARTER'
ALTER TABLE public.empresas ALTER COLUMN plan_suscripcion SET DEFAULT 'STARTER'::plan_suscripcion;

-- =====================================================================
-- (OPCIONAL) REINICIAR LOS 7 DÍAS A PARTIR DE HOY
-- Quita los dos guiones (--) del inicio de la línea de abajo si quieres 
-- resetear tu empresa para volver a tener los 7 días justos desde ahora:
-- =====================================================================
-- UPDATE public.empresas SET fecha_registro = NOW() WHERE estado = 'TRIAL';
