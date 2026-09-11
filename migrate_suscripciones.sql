-- =============================================================================
-- MIGRACIÓN: SISTEMA DE SUSCRIPCIONES Y PAGOS (SaaS)
-- =============================================================================

-- 1. Modificar tabla empresas para control de licencias avanzado
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS modulos_activos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estado_suscripcion VARCHAR(50) DEFAULT 'TRIAL';

COMMENT ON COLUMN public.empresas.modulos_activos IS 'Arreglo con los IDs de módulos extra pagados (ej. multi-price, virtual-pos)';
COMMENT ON COLUMN public.empresas.estado_suscripcion IS 'TRIAL, ACTIVA, GRACIA, VENCIDA';

-- 2. Crear tabla de reportes de pago de suscripción
CREATE TABLE IF NOT EXISTS public.pagos_suscripcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  monto DECIMAL(12,2) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL,
  referencia VARCHAR(100),
  comprobante_url TEXT,
  estado VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, APROBADO, RECHAZADO
  plan_solicitado VARCHAR(50),             -- STARTER, PRO, ENTERPRISE
  fecha_reporte TIMESTAMPTZ DEFAULT NOW(),
  notas_admin TEXT
);

COMMENT ON TABLE public.pagos_suscripcion IS 'Registro de pagos reportados manualmente por los clientes para su suscripción';

-- Habilitar RLS para pagos_suscripcion
ALTER TABLE public.pagos_suscripcion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas ven sus propios pagos"
  ON public.pagos_suscripcion FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios pueden reportar pagos para su empresa"
  ON public.pagos_suscripcion FOR INSERT
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()));


-- 3. Crear Storage Bucket para los comprobantes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprobantes', 'comprobantes', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para el bucket 'comprobantes'
CREATE POLICY "Comprobantes visibles públicamente"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'comprobantes');

CREATE POLICY "Usuarios autenticados pueden subir comprobantes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'comprobantes');
