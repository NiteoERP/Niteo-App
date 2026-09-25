-- =============================================================================
-- MIGRACIÓN: MEJORAS AL SISTEMA DE COBRANZA Y SUSCRIPCIONES
-- Fecha: 2026-09-25
-- Descripción:
--   1. Añade email_contacto a empresas (visible en panel admin)
--   2. Añade plan_solicitado a suscripciones_pagos (detectar plan sin parsear referencia)
--   3. Añade comprobante_url a suscripciones_pagos (URL del comprobante subido)
--   4. Añade notas_admin a suscripciones_pagos (motivo de rechazo sin destruir referencia)
--   5. Añade valor 'gracia' al enum estado_suscripcion (para auto-grace period)
-- =============================================================================

-- 1. Campo de contacto en empresas (visible en el panel SuperAdmin)
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS email_contacto text;

COMMENT ON COLUMN public.empresas.email_contacto IS 'Email de contacto principal del negocio';

-- 2. Plan solicitado en pagos (reemplaza el parseo frágil del campo referencia)
ALTER TABLE public.suscripciones_pagos
  ADD COLUMN IF NOT EXISTS plan_solicitado text;

COMMENT ON COLUMN public.suscripciones_pagos.plan_solicitado IS 'Plan solicitado en el pago: STARTER, PRO, ENTERPRISE. Incluye módulos extra ej: PRO + [recetas,multi-price]';

-- 3. URL del comprobante de pago (imagen/PDF adjunto)
ALTER TABLE public.suscripciones_pagos
  ADD COLUMN IF NOT EXISTS comprobante_url text;

COMMENT ON COLUMN public.suscripciones_pagos.comprobante_url IS 'Path en Storage bucket comprobantes/ del archivo adjunto';

-- 4. Notas del administrador al revisar el pago (rechazo con motivo)
ALTER TABLE public.suscripciones_pagos
  ADD COLUMN IF NOT EXISTS notas_admin text;

COMMENT ON COLUMN public.suscripciones_pagos.notas_admin IS 'Nota interna del SuperAdmin al aprobar o rechazar. No sobreescribe la referencia del cliente';

-- 5. Añadir 'gracia' al enum estado_suscripcion (para auto-grace period al reportar pago)
--    Ejecutar solo si el tipo existe y no tiene el valor aún
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_suscripcion') THEN
    -- Añadir valor si no existe (PostgreSQL 9.1+)
    ALTER TYPE estado_suscripcion ADD VALUE IF NOT EXISTS 'gracia';
    ALTER TYPE estado_suscripcion ADD VALUE IF NOT EXISTS 'GRACIA';
  END IF;
END$$;
