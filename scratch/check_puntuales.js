const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('compras_puntuales').select('id, detalles, id_sede').order('fecha_registro', { ascending: false }).limit(3);
  console.log('compras_puntuales:', JSON.stringify(data, null, 2));
}
run();
