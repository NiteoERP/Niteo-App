-- =============================================================================
-- FIX: ENUM DE PLANES Y ESTADOS
-- =============================================================================

-- 1. Agregar 'STARTER' al ENUM plan_suscripcion
-- Nota: Si usas Supabase, la forma más segura de agregar un valor a un ENUM
-- es a través de ALTER TYPE.
COMMIT; -- Por si acaso hay una transacción activa
ALTER TYPE plan_suscripcion ADD VALUE IF NOT EXISTS 'STARTER';

-- 2. Agregar 'TRIAL' al ENUM estado_suscripcion
ALTER TYPE estado_suscripcion ADD VALUE IF NOT EXISTS 'TRIAL';

-- 3. (Opcional) Migrar empresas que digan 'BASICO' a 'STARTER'
UPDATE public.empresas SET plan = 'STARTER' WHERE plan = 'BASICO';

-- =============================================================================
-- ACERCA DEL USUARIO SUPERADMIN O MASTER
-- =============================================================================
-- El rol del usuario NO se guarda en la tabla 'empresas'.
-- Se guarda en la tabla 'perfiles', en la columna 'rol'.
-- Ve a la tabla 'perfiles', busca tu usuario y cambia su 'rol' a 'MASTER' o 'SUPERADMIN'.
