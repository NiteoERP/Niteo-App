-- =============================================================================
-- FIX: FORZAR MODO TRIAL PARA SUSCRIPCIONES SIN PAGAR
-- =============================================================================

-- 1. Asegurar que 'STARTER' y 'TRIAL' existen en los ENUMs
COMMIT; 
ALTER TYPE plan_suscripcion ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE estado_suscripcion ADD VALUE IF NOT EXISTS 'TRIAL';

-- 2. Actualizar las suscripciones a 'TRIAL' si NO son 'LIFETIME'
UPDATE public.suscripciones_empresas
SET estado = 'TRIAL'
WHERE plan != 'LIFETIME' OR plan IS NULL;

-- 3. (Opcional) Migrar planes 'BASICO' a 'STARTER'
UPDATE public.suscripciones_empresas SET plan = 'STARTER' WHERE plan = 'BASICO';

-- =====================================================================
-- (OPCIONAL) REINICIAR LOS 7 DÍAS A PARTIR DE HOY
-- =====================================================================
-- UPDATE public.suscripciones_empresas SET fecha_registro = NOW() WHERE estado = 'TRIAL';
