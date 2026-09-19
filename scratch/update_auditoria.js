const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ddl = `
-- 1. Vaciar auditoria_log
TRUNCATE TABLE public.auditoria_log;

-- 2. Modificar los triggers para que solo se disparen en UPDATE o DELETE

-- FACTURAS
DROP TRIGGER IF EXISTS trigger_auditoria_facturas ON public.ventas_facturas;
CREATE TRIGGER trigger_auditoria_facturas
  AFTER UPDATE OR DELETE ON public.ventas_facturas
  FOR EACH ROW EXECUTE FUNCTION function_auditoria();

-- PAGOS
DROP TRIGGER IF EXISTS trigger_auditoria_pagos ON public.ventas_pagos;
CREATE TRIGGER trigger_auditoria_pagos
  AFTER UPDATE OR DELETE ON public.ventas_pagos
  FOR EACH ROW EXECUTE FUNCTION function_auditoria();

-- PRODUCTOS
DROP TRIGGER IF EXISTS trigger_auditoria_productos ON public.productos;
CREATE TRIGGER trigger_auditoria_productos
  AFTER UPDATE OR DELETE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION function_auditoria();

-- CLIENTES
DROP TRIGGER IF EXISTS trigger_auditoria_clientes ON public.clientes;
CREATE TRIGGER trigger_auditoria_clientes
  AFTER UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION function_auditoria();
`;

async function run() {
  const { error } = await supabase.rpc('exec_sql', { query: ddl });
  if (error) console.error("Error modifying triggers:", error);
  else console.log("Auditoria triggers updated successfully!");
}
run();
