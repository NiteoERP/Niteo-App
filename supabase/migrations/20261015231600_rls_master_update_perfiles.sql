-- Migración: Permitir a usuarios con rol MASTER o SUPERADMIN actualizar perfiles de su propia empresa
-- Esto garantiza aislamiento multi-tenant por RLS directamente en la base de datos sin depender de service_role.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'perfiles' AND policyname = 'perfiles_update_master_misma_empresa'
  ) THEN
    CREATE POLICY "perfiles_update_master_misma_empresa"
      ON public.perfiles
      FOR UPDATE
      TO authenticated
      USING (
        empresa_id = jwt_empresa_id()
        AND (
          (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'user_role') IN ('MASTER', 'SUPERADMIN')
          OR
          (SELECT rol FROM public.perfiles WHERE id = (SELECT auth.uid())) IN ('MASTER', 'SUPERADMIN')
        )
      )
      WITH CHECK (
        empresa_id = jwt_empresa_id()
      );
  END IF;
END $$;
