const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('sedes')
    .select('*')
    .eq('id', 'acdc769e-4160-46f5-b5d6-aa5fc3a68854');
  
  if (error) console.error(error);
  else console.log(data);
}

main();
