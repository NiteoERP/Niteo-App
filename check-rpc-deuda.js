const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ventas_facturas?select=id,numero_factura,total,saldo_pendiente,created_at&limit=1`, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  console.log("ventas_facturas columns:", Object.keys(data[0] || {}));
}
run();
