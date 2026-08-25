
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const res = await supabase.from("pos_cuentas_abiertas").insert({ id: "123e4567-e89b-12d3-a456-426614174000", unknown_column: 1 });
  console.log("Insert Error details:", res.error);
}
run();

