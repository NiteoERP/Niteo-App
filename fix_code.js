const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('sedes')
    .update({ codigo_terminal: 'MESA-HACQ' })
    .eq('id', 'b42d7e13-bfc8-40d8-94d4-61908ff269cd')
    .select();
    
  console.log("Error:", error);
}
main();
