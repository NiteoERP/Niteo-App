const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteCierre() {
  const id = '1911e6d4-9416-4fdc-961a-319157e7eeb1';
  console.log('Deleting transactions...');
  await supabase.from('cierres_transacciones').delete().eq('cierre_id', id);
  console.log('Deleting closure...');
  const { data, error } = await supabase.from('cierres_caja').delete().eq('id', id);
  console.log(error ? error : 'Deleted!');
}

deleteCierre();
