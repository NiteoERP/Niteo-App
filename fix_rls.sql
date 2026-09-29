-- Allow authenticated users to update sedes if they belong to the same empresa
CREATE POLICY "Permitir update a sedes de la empresa" ON public.sedes
FOR UPDATE
TO authenticated
USING (empresa_id = auth.jwt()->'app_metadata'->>'empresa_id')
WITH CHECK (empresa_id = auth.jwt()->'app_metadata'->>'empresa_id');
