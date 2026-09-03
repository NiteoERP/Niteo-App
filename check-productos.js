const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  const table = data.definitions.productos;
  console.log(Object.keys(table.properties));
}
run();
