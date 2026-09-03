import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getColumns(table: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const spec = await res.json();
  const def = spec.definitions[table];
  console.log(`\nTable ${table}:`);
  if (def && def.properties) {
      for (const [col, info] of Object.entries(def.properties)) {
          const type = (info as any).type || (info as any).format || 'unknown';
          console.log(`  ${col}: ${type}`);
      }
  } else {
      console.log('Not found');
  }
}
async function run() {
  await getColumns('contabilidad_cuentas');
  await getColumns('contabilidad_asientos');
  await getColumns('contabilidad_movimientos');
}
run().catch(console.error)
