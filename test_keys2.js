
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users } = await supabase.from("perfiles").select("empresa_id").limit(1);
  const empresa_id = users[0]?.empresa_id || "00000000-0000-0000-0000-000000000000";
  
  const { data } = await supabase.rpc("get_proveedores_con_deuda", {
    p_empresa_id: empresa_id,
    p_sede_id: null
  }).limit(1);
  
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  }
}
run();

