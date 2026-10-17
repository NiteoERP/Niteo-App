-- ============================================================================
-- Migración: Corrección integral de Cobranza Niteo (Storage, Enums y RLS)
-- Fecha: 2026-10-16
-- ============================================================================

-- 1. Asegurar todos los valores en el enum estado_suscripcion (mayúsculas y minúsculas por compatibilidad)
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'ACTIVA';
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'VENCIDA';
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'SUSPENDIDA';
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'GRACIA';
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'activa';
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'vencida';
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'suspendida';
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'trial';
ALTER TYPE public.estado_suscripcion ADD VALUE IF NOT EXISTS 'gracia';

-- 2. Sincronizar raw_app_meta_data.empresa_id en auth.users para cualquier perfil que no lo tenga
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('empresa_id', p.empresa_id::text)
FROM public.perfiles p
WHERE u.id = p.id
  AND p.empresa_id IS NOT NULL
  AND (u.raw_app_meta_data ->> 'empresa_id') IS NULL;

-- 3. Crear el bucket 'comprobantes' para almacenar captures de pagos de suscripción y QRs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes',
  'comprobantes',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

-- 4. Políticas RLS en storage.objects para el bucket 'comprobantes'
DROP POLICY IF EXISTS "comprobantes_select_public" ON storage.objects;
CREATE POLICY "comprobantes_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "comprobantes_insert_auth" ON storage.objects;
CREATE POLICY "comprobantes_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "comprobantes_update_auth" ON storage.objects;
CREATE POLICY "comprobantes_update_auth"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'comprobantes')
WITH CHECK (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "comprobantes_delete_superadmin" ON storage.objects;
CREATE POLICY "comprobantes_delete_superadmin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'comprobantes'
  AND EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE perfiles.id = (SELECT auth.uid())
      AND perfiles.rol::text = 'SUPERADMIN'
  )
);

-- 5. Mejorar RLS en suscripciones_pagos (soportar tanto JWT como fallback a tabla perfiles + SUPERADMIN)
DROP POLICY IF EXISTS "Empresas pueden ver y registrar sus propios pagos" ON public.suscripciones_pagos;
CREATE POLICY "Empresas pueden ver y registrar sus propios pagos"
ON public.suscripciones_pagos
FOR ALL
TO authenticated
USING (
  empresa_id = COALESCE(
    public.jwt_empresa_id(),
    (SELECT p.empresa_id FROM public.perfiles p WHERE p.id = (SELECT auth.uid()))
  )
  OR EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = (SELECT auth.uid()) AND p.rol::text = 'SUPERADMIN'
  )
)
WITH CHECK (
  empresa_id = COALESCE(
    public.jwt_empresa_id(),
    (SELECT p.empresa_id FROM public.perfiles p WHERE p.id = (SELECT auth.uid()))
  )
  OR EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = (SELECT auth.uid()) AND p.rol::text = 'SUPERADMIN'
  )
);

-- 6. Mejorar RLS en suscripciones_empresas para lectura por perfiles y gestión por SUPERADMIN
DROP POLICY IF EXISTS "jwt_suscripciones" ON public.suscripciones_empresas;
CREATE POLICY "jwt_suscripciones"
ON public.suscripciones_empresas
FOR SELECT
TO authenticated
USING (
  empresa_id = COALESCE(
    public.jwt_empresa_id(),
    (SELECT p.empresa_id FROM public.perfiles p WHERE p.id = (SELECT auth.uid()))
  )
  OR EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = (SELECT auth.uid()) AND p.rol::text = 'SUPERADMIN'
  )
);
