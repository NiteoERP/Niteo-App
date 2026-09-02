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
  const paths = Object.keys(data.paths).filter(k => k.startsWith('/rpc/'));
  console.log(paths.filter(p => p.includes('venta') || p.includes('descontar')));
}
run();
