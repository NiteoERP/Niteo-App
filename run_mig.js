const { Client } = require('pg');
const fs = require('fs');

const client = new Client('postgresql://postgres.gqlhillifpxizbaqaagl:oI2361M7Qj5vYIUB@aws-0-us-east-1.pooler.supabase.com:6543/postgres');

async function run() {
  await client.connect();
  const sql = fs.readFileSync('migration_servicio_reventa.sql', 'utf8');
  await client.query(sql);
  console.log('Migration applied');
  
  // also let's update existing reventa insumos
  await client.query(`UPDATE public.inventario_insumos SET es_reventa = true WHERE nombre LIKE '%(Reventa)%'`);
  console.log('Updated existing reventa insumos');

  await client.end();
}

run().catch(console.error);
