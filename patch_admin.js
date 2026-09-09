
const fs = require('fs');
let p = fs.readFileSync('src/actions/compras-actions.ts', 'utf8');

if (!p.includes('supabaseAdmin')) {
  p = p.replace("import { registrarAsiento } from './contabilidad-actions';", "import { registrarAsiento } from './contabilidad-actions';\nimport { createClient as createAdminClient } from '@supabase/supabase-js';\nconst supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);");
}

p = p.replace(/const \{ error: rpcErr \} = await registrarCompraInsumoJS\(supabase,/g, "const { error: rpcErr } = await registrarCompraInsumoJS(supabaseAdmin,");

p = p.replace(/const \{ data: newIns \} = await supabase\.from\('inventario_insumos'\)\.insert/g, "const { data: newIns, error: insErr } = await supabaseAdmin.from('inventario_insumos').insert");

p = p.replace(/if \(newIns\) idInsumo = newIns\.id;/g, "if (insErr) console.error('Error insertando nuevo insumo:', insErr);\n      if (newIns) idInsumo = newIns.id;");

// In editarFacturaInsumos, old item stock adjustment:
p = p.replace(/await supabase\.from\('inventario_insumos'\)\.update\(\{ cantidad_actual: newCant \}\)\.eq\('id', oldItem\.insumo_id\);/g, "await supabaseAdmin.from('inventario_insumos').update({ cantidad_actual: newCant }).eq('id', oldItem.insumo_id);");

fs.writeFileSync('src/actions/compras-actions.ts', p);
console.log('✅ patched compras-actions.ts');
