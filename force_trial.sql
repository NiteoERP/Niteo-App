-- =============================================================================
-- FIX: FORZAR MODO TRIAL PARA EMPRESAS SIN PAGAR
-- =============================================================================

-- 1. Actualizar todas las empresas a 'TRIAL' si NO son 'LIFETIME'
UPDATE public.empresas
SET estado_suscripcion = 'TRIAL'
WHERE plan_suscripcion != 'LIFETIME' OR plan_suscripcion IS NULL;

-- 2. Asegurarse de que el valor por defecto para nuevas empresas sea 'TRIAL'
ALTER TABLE public.empresas ALTER COLUMN estado_suscripcion SET DEFAULT 'TRIAL'::estado_suscripcion;

-- 3. Asegurarse de que el plan por defecto para nuevas empresas sea 'STARTER'
ALTER TABLE public.empresas ALTER COLUMN plan_suscripcion SET DEFAULT 'STARTER'::plan_suscripcion;

-- =============================================================================
-- OPCIONAL: REINICIAR LOS 7 DÍAS DE PRUEBA
-- =============================================================================
-- Si creaste tu empresa hace más de 7 días, el sistema la marcará como "VENCIDA" 
-- en lugar de "TRIAL: Quedan 7 días". Si quieres reiniciar el reloj para 
-- volver a tener 7 días de prueba desde hoy, quita los dos guiones (--) a la siguiente línea:

-- UPDATE public.empresas SET fecha_registro = NOW() WHERE estado_suscripcion = 'TRIAL';
