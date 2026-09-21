const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Let's test if exec_sql can run ALTER TABLE or CREATE POLICY
  const sql1 = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'compras_facturas' AND policyname = 'facturas_delete'
      ) THEN
        CREATE POLICY "facturas_delete" ON public.compras_facturas
          FOR DELETE TO authenticated
          USING (auth.role() = 'authenticated');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'compras_pagos' AND policyname = 'pagos_delete'
      ) THEN
        CREATE POLICY "pagos_delete" ON public.compras_pagos
          FOR DELETE TO authenticated
          USING (auth.role() = 'authenticated');
      END IF;
    END $$
  `;

  // Wait, DO $$ $$ does not return rows. Let's see if we can use a query that returns rows:
  const query = `
    SELECT 1 AS result
  `;
  const { data, error } = await supabase.rpc('exec_sql', { query: sql1 });
  console.log('Result DO block:', data, error);
}
run();
