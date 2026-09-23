require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ddl(label, sql) {
  const { data, error } = await supabase.rpc('execute_ddl', { sql_text: sql });
  if (error) {
    const msg = error.message || '';
    if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('does not exist')) {
      console.log(`  ⚠️  ${label}: ${msg.substring(0, 80)} (OK — ignorado)`);
    } else {
      console.error(`  ❌ ${label}: ${msg}`);
    }
  } else {
    console.log(`  ✅ ${label}`);
  }
}

async function query(label, sql) {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error(`  ❌ ${label}: ${error.message}`);
  } else {
    console.log(`  ✅ ${label}:`, JSON.stringify(data).substring(0, 100));
  }
}

async function run() {
  console.log('\n🚀 Aplicando migración: Módulo Mesero\n');
  console.log('── Paso 1: Columnas en sedes ──');

  await ddl(
    'sedes: ADD COLUMN codigo_terminal',
    "ALTER TABLE public.sedes ADD COLUMN codigo_terminal TEXT"
  );

  await ddl(
    'sedes: ADD COLUMN codigo_terminal_activo',
    "ALTER TABLE public.sedes ADD COLUMN codigo_terminal_activo BOOLEAN DEFAULT true"
  );

  await ddl(
    'sedes: INDEX codigo_terminal',
    "CREATE UNIQUE INDEX idx_sedes_codigo_terminal ON public.sedes(codigo_terminal) WHERE codigo_terminal IS NOT NULL"
  );

  console.log('\n── Paso 2: Tabla comandas_mesero ──');

  await ddl('CREATE TABLE comandas_mesero', `
    CREATE TABLE IF NOT EXISTS public.comandas_mesero (
      id            uuid                     DEFAULT gen_random_uuid() PRIMARY KEY,
      empresa_id    uuid                     NOT NULL REFERENCES public.empresas(id)  ON DELETE CASCADE,
      sede_id       uuid                     NOT NULL REFERENCES public.sedes(id)     ON DELETE CASCADE,
      mesero_id     uuid                     NOT NULL REFERENCES public.perfiles(id)  ON DELETE SET NULL,
      mesero_nombre text                     NOT NULL,
      tipo          text                     NOT NULL DEFAULT 'comanda',
      mesa_identificador text               NOT NULL,
      cliente_nombre     text,
      comentario_general text,
      metodo_pago_sugerido text,
      items         jsonb                    NOT NULL DEFAULT '[]'::jsonb,
      estado        text                     NOT NULL DEFAULT 'pendiente',
      created_at    timestamptz              DEFAULT now(),
      processed_at  timestamptz
    )
  `);

  await ddl(
    'ADD CHECK tipo',
    "ALTER TABLE public.comandas_mesero ADD CONSTRAINT comandas_tipo_check CHECK (tipo IN ('comanda', 'alerta_pago'))"
  );

  await ddl(
    'ADD CHECK estado',
    "ALTER TABLE public.comandas_mesero ADD CONSTRAINT comandas_estado_check CHECK (estado IN ('pendiente', 'recibido', 'cancelado'))"
  );

  await ddl(
    'INDEX: sede + estado',
    "CREATE INDEX IF NOT EXISTS idx_comandas_sede_estado ON public.comandas_mesero(sede_id, estado, created_at DESC)"
  );

  await ddl(
    'INDEX: empresa',
    "CREATE INDEX IF NOT EXISTS idx_comandas_empresa ON public.comandas_mesero(empresa_id)"
  );

  console.log('\n── Paso 3: RLS comandas_mesero ──');

  await ddl('ENABLE RLS', "ALTER TABLE public.comandas_mesero ENABLE ROW LEVEL SECURITY");

  await ddl('POLICY: mesero insert', `
    CREATE POLICY mesero_insert_propia_comanda ON public.comandas_mesero
    FOR INSERT TO authenticated
    WITH CHECK (
      mesero_id = (SELECT auth.uid())
      AND empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid()))
    )
  `);

  await ddl('POLICY: empresa select', `
    CREATE POLICY empresa_puede_leer_comandas ON public.comandas_mesero
    FOR SELECT TO authenticated
    USING (
      empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid()))
    )
  `);

  await ddl('POLICY: empresa update estado', `
    CREATE POLICY empresa_puede_actualizar_estado_comanda ON public.comandas_mesero
    FOR UPDATE TO authenticated
    USING (
      empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid()))
    )
    WITH CHECK (
      empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid()))
    )
  `);

  console.log('\n── Paso 4: RLS en sedes ──');

  // Verificar si ya existe la policy de UPDATE en sedes
  const { data: existingPolicies } = await supabase.rpc('exec_sql', {
    query: "SELECT policyname FROM pg_policies WHERE tablename='sedes'"
  });
  const policyNames = existingPolicies?.map(p => p.policyname) || [];
  console.log('  Policies actuales en sedes:', policyNames.join(', '));

  if (!policyNames.includes('empresa_puede_actualizar_codigo_terminal')) {
    await ddl('POLICY: sedes update codigo_terminal', `
      CREATE POLICY empresa_puede_actualizar_codigo_terminal ON public.sedes
      FOR UPDATE TO authenticated
      USING (
        empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid()))
      )
      WITH CHECK (
        empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = (SELECT auth.uid()))
      )
    `);
  } else {
    console.log('  ⚠️  POLICY sedes update: ya existe (OK)');
  }

  console.log('\n── Verificación final ──');

  await query('Columnas en sedes', "SELECT column_name FROM information_schema.columns WHERE table_name='sedes' AND column_name IN ('codigo_terminal','codigo_terminal_activo')");
  await query('Tabla comandas_mesero existe', "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='comandas_mesero'");
  await query('Policies en comandas_mesero', "SELECT policyname FROM pg_policies WHERE tablename='comandas_mesero'");

  console.log('\n🎉 Migración completada\n');
}

run().catch(console.error);
