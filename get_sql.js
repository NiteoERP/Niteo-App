
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc("exec_sql", { query: "SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'get_dashboard_rentabilidad'" });
  console.log(data || error);
}
run();

