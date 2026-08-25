const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc("ejecutar_sql", { 
    sql: "ALTER TABLE compras_puntuales ADD COLUMN IF NOT EXISTS detalles_items JSONB DEFAULT '[]'::jsonb;" 
  });
  console.log("Migration:", data, error);
}
run();
