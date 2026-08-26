const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);
async function run() {
  const { data } = await supabase.from('compras_puntuales').select('id, proveedor, detalles, monto_divisas, created_at').order('created_at', { ascending: false }).limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
