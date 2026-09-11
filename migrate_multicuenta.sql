-- =============================================================================
-- MIGRACIÓN: SOPORTE MULTICUENTA (Selector de Empresas)
-- =============================================================================

-- 1. Crear tabla de relación (Muchos a Muchos)
CREATE TABLE IF NOT EXISTS public.usuarios_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  rol VARCHAR(50) DEFAULT 'CAJERO',
  UNIQUE(usuario_id, empresa_id)
);

COMMENT ON TABLE public.usuarios_empresas IS 'Relación que permite a un usuario pertenecer a múltiples empresas. perfiles.empresa_id solo indica la empresa ACTIVA actualmente.';

-- 2. Migrar los datos existentes (Todos los usuarios actuales se enlazan a su empresa actual)
INSERT INTO public.usuarios_empresas (usuario_id, empresa_id, rol)
SELECT id, empresa_id, rol 
FROM public.perfiles 
WHERE empresa_id IS NOT NULL
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

-- 3. Habilitar RLS
ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;

-- 4. Políticas
CREATE POLICY "Usuarios ven sus propias relaciones"
  ON public.usuarios_empresas FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "SuperAdmins o Dueños pueden agregar usuarios"
  ON public.usuarios_empresas FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.perfiles WHERE rol = 'SUPERADMIN' OR rol = 'MASTER')
  );
