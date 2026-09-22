-- ============================================================
-- MIGRACIÓN: Módulo Mesero
-- Ejecutar en Supabase SQL Editor o via CLI
-- ============================================================

-- 1. Agregar código de terminal a la tabla sedes
ALTER TABLE public.sedes 
  ADD COLUMN IF NOT EXISTS codigo_terminal TEXT,
  ADD COLUMN IF NOT EXISTS codigo_terminal_activo BOOLEAN DEFAULT true;

-- Índice único para búsqueda por código (ignorando nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sedes_codigo_terminal 
  ON public.sedes(codigo_terminal) 
  WHERE codigo_terminal IS NOT NULL;

-- ============================================================
-- 2. Tabla comandas_mesero
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comandas_mesero (
  id            uuid                     DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    uuid                     NOT NULL REFERENCES public.empresas(id)  ON DELETE CASCADE,
  sede_id       uuid                     NOT NULL REFERENCES public.sedes(id)     ON DELETE CASCADE,
  mesero_id     uuid                     NOT NULL REFERENCES public.perfiles(id)  ON DELETE SET NULL,
  mesero_nombre text                     NOT NULL,
  tipo          text                     NOT NULL DEFAULT 'comanda'
                                         CHECK (tipo IN ('comanda', 'alerta_pago')),
  mesa_identificador text               NOT NULL,
  cliente_nombre     text,
  comentario_general text,
  metodo_pago_sugerido text,            -- solo para tipo='alerta_pago'
  items         jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  estado        text                     NOT NULL DEFAULT 'pendiente'
                                         CHECK (estado IN ('pendiente', 'recibido', 'cancelado')),
  created_at    timestamptz              DEFAULT now(),
  processed_at  timestamptz
);

-- Índices para el worker del POS (polling por sede + estado + fecha)
CREATE INDEX IF NOT EXISTS idx_comandas_sede_estado 
  ON public.comandas_mesero(sede_id, estado, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comandas_empresa 
  ON public.comandas_mesero(empresa_id);

-- ============================================================
-- 3. RLS — comandas_mesero
-- ============================================================
ALTER TABLE public.comandas_mesero ENABLE ROW LEVEL SECURITY;

-- Mesero puede insertar sus propias comandas (empresa_id debe coincidir con su empresa)
CREATE POLICY "mesero_insert_propia_comanda"
  ON public.comandas_mesero
  FOR INSERT
  TO authenticated
  WITH CHECK (
    mesero_id = (SELECT auth.uid())
    AND empresa_id = (
      SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid())
    )
  );

-- Cualquier autenticado de la misma empresa puede leer comandas de su empresa
-- (necesario para que el POS haga polling y para que otros meseros vean mesas abiertas)
CREATE POLICY "empresa_puede_leer_comandas"
  ON public.comandas_mesero
  FOR SELECT
  TO authenticated
  USING (
    empresa_id = (
      SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid())
    )
  );

-- El POS (autenticado como cualquier usuario de la empresa) puede actualizar el estado
CREATE POLICY "empresa_puede_actualizar_estado_comanda"
  ON public.comandas_mesero
  FOR UPDATE
  TO authenticated
  USING (
    empresa_id = (
      SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    empresa_id = (
      SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 4. RLS en sedes — los usuarios autenticados de la empresa pueden
--    leer el codigo_terminal de sus propias sedes (para vincular)
-- ============================================================

-- Verificar si ya existe una policy de SELECT en sedes y agregar si no
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sedes' AND policyname = 'empresa_puede_leer_sus_sedes'
  ) THEN
    ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "empresa_puede_leer_sus_sedes"
      ON public.sedes
      FOR SELECT
      TO authenticated
      USING (
        empresa_id = (
          SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

-- Permite que el POS (autenticado) actualice codigo_terminal de su propia sede
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sedes' AND policyname = 'empresa_puede_actualizar_codigo_terminal'
  ) THEN
    CREATE POLICY "empresa_puede_actualizar_codigo_terminal"
      ON public.sedes
      FOR UPDATE
      TO authenticated
      USING (
        empresa_id = (
          SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        empresa_id = (
          SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;
