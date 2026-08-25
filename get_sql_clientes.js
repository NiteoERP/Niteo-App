
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc("get_clientes_con_deuda", {
    p_empresa_id: "00000000-0000-0000-0000-000000000000",
    p_sede_id: null,
    p_fecha_inicio: "2026-01-01T00:00:00Z",
    p_fecha_fin: "2026-12-31T23:59:59Z"
  });
  console.log(error);
}
run();

