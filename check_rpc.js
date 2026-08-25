
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let us fetch the actual user profile to get a valid empresa_id
  const { data: users } = await supabase.from("perfiles").select("empresa_id").limit(1);
  const { data, error } = await supabase.rpc("get_dashboard_rentabilidad", {
    p_empresa_id: users[0]?.empresa_id,
    p_fecha_inicio: "2026-08-01T00:00:00Z",
    p_fecha_fin: "2026-08-31T23:59:59Z",
    p_sede_id: null
  });
  console.log(JSON.stringify(data?.[0]));
}
run();

