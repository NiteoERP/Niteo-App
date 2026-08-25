
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users } = await supabase.from("perfiles").select("empresa_id").limit(1);
  const empresa_id = users[0]?.empresa_id || "00000000-0000-0000-0000-000000000000";
  
  const { data, error, count } = await supabase.rpc("get_clientes_con_deuda", {
    p_empresa_id: empresa_id,
    p_sede_id: null,
    p_fecha_inicio: "2020-01-01T00:00:00Z",
    p_fecha_fin: "2030-01-01T00:00:00Z"
  }, { count: "exact" })
  .ilike("nombre_comercial", "%a%")
  .range(0, 5);
  
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  console.log("Count:", count);
}
run();

