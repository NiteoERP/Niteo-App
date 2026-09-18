require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.npxgnyfshgexbmlmjjpu:Niteo2024$$**@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  const q = `
    ALTER TABLE compras_puntuales ADD COLUMN IF NOT EXISTS modificado boolean DEFAULT false;
    ALTER TABLE compras_puntuales ADD COLUMN IF NOT EXISTS usuario_modificacion_id uuid REFERENCES auth.users(id);
    ALTER TABLE compras_puntuales ADD COLUMN IF NOT EXISTS fecha_modificacion timestamp with time zone;
    
    ALTER TABLE compras_facturas ADD COLUMN IF NOT EXISTS modificado boolean DEFAULT false;
    ALTER TABLE compras_facturas ADD COLUMN IF NOT EXISTS usuario_modificacion_id uuid REFERENCES auth.users(id);
    ALTER TABLE compras_facturas ADD COLUMN IF NOT EXISTS fecha_modificacion timestamp with time zone;
    
    ALTER TABLE productos ADD COLUMN IF NOT EXISTS porcentaje_ganancia numeric(10,2);
    ALTER TABLE productos ADD COLUMN IF NOT EXISTS es_reventa boolean DEFAULT false;
  `;
  await client.query(q);
  console.log('Migraciones terminadas exitosamente');
  await client.end();
}
run();
