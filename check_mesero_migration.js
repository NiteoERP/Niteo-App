require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function execSql(label, query) {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    // Algunos errores son esperados (ej: columna ya existe)
    const msg = error.message || '';
    if (msg.includes('already exists') || msg.includes('ya existe') || msg.includes('duplicate')) {
      console.log(`  ⚠️  ${label}: ya existe (OK)`);
    } else {
      console.error(`  ❌ ${label}: ${msg}`);
    }
  } else {
    console.log(`  ✅ ${label}`);
  }
}

async function run() {
  console.log('\n🚀 Aplicando migración: Módulo Mesero\n');

  // 1. ALTER TABLE sedes — agregar codigo_terminal
  await execSql(
    'sedes: ADD COLUMN codigo_terminal',
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name='sedes' AND column_name='codigo_terminal'`
  );

  // Intentamos agregar la columna directamente — exec_sql solo permite SELECT
  // Usamos una función temporal con SECURITY DEFINER para poder ejecutar DDL
  // Primero creamos la función helper
  await execSql(
    'Crear función run_ddl temporal',
    `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'run_ddl'`
  );

  console.log('\nVerificando estado actual de sedes...');
  const { data: cols } = await supabase.rpc('exec_sql', {
    query: `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='sedes' ORDER BY column_name`
  });
  console.log('Columnas en sedes:', cols?.map(r => r.column_name).join(', '));

  console.log('\nVerificando si tabla comandas_mesero existe...');
  const { data: tables } = await supabase.rpc('exec_sql', {
    query: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='comandas_mesero'`
  });
  console.log('comandas_mesero existe:', tables?.length > 0 ? 'SÍ' : 'NO');

  // Verificar si ya hay policies en sedes
  const { data: policies } = await supabase.rpc('exec_sql', {
    query: `SELECT policyname FROM pg_policies WHERE tablename='sedes'`
  });
  console.log('Policies en sedes:', policies?.map(p => p.policyname).join(', ') || 'ninguna');
}

run().catch(console.error);
