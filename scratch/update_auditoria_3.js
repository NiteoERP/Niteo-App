const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql1 = `
CREATE OR REPLACE FUNCTION run_ddl_auditoria() RETURNS text AS $$
BEGIN
  DELETE FROM public.auditoria_log;
  DROP TRIGGER IF EXISTS trigger_auditoria_facturas ON public.ventas_facturas;
  CREATE TRIGGER trigger_auditoria_facturas AFTER UPDATE OR DELETE ON public.ventas_facturas FOR EACH ROW EXECUTE FUNCTION function_auditoria();
  DROP TRIGGER IF EXISTS trigger_auditoria_pagos ON public.ventas_pagos;
  CREATE TRIGGER trigger_auditoria_pagos AFTER UPDATE OR DELETE ON public.ventas_pagos FOR EACH ROW EXECUTE FUNCTION function_auditoria();
  DROP TRIGGER IF EXISTS trigger_auditoria_productos ON public.productos;
  CREATE TRIGGER trigger_auditoria_productos AFTER UPDATE OR DELETE ON public.productos FOR EACH ROW EXECUTE FUNCTION function_auditoria();
  DROP TRIGGER IF EXISTS trigger_auditoria_clientes ON public.clientes;
  CREATE TRIGGER trigger_auditoria_clientes AFTER UPDATE OR DELETE ON public.clientes FOR EACH ROW EXECUTE FUNCTION function_auditoria();
  RETURN 'Done'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const sql2 = `SELECT run_ddl_auditoria();`;

async function run() {
  const r1 = await supabase.rpc('exec_sql', { query: sql1 });
  console.log('CREATE FUNCTION result:', r1);

  const r2 = await supabase.rpc('exec_sql', { query: sql2 });
  console.log('EXECUTE FUNCTION result:', r2);
}
run();
