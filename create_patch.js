const fs = require('fs');

let content = fs.readFileSync('src/actions/compras-actions.ts', 'utf8');

// We will inject the creation of an admin client inside registrarFacturaInsumos and editarFacturaInsumos, or globally.
const adminImport = `import { createClient as createAdminClient } from '@supabase/supabase-js';\nconst supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);`;

content = content.replace(`import { registrarAsiento } from './contabilidad-actions';`, `import { registrarAsiento } from './contabilidad-actions';\n${adminImport}`);

// Replace in registrarFacturaInsumos:
// Find where it inserts new insumos and where it calls registrarCompraInsumoJS
content = content.replace(`const { data: newIns } = await supabase.from('inventario_insumos').insert({`, `const { data: newIns, error: insErr } = await supabaseAdmin.from('inventario_insumos').insert({`);
content = content.replace(`if (newIns) idInsumo = newIns.id;`, `if (insErr) console.error("Error insertando insumo:", insErr);\n      if (newIns) idInsumo = newIns.id;`);

content = content.replace(`const { error: rpcErr } = await registrarCompraInsumoJS(supabase, idInsumo, user.id, item.cantidad, usd);`, `const { error: rpcErr } = await registrarCompraInsumoJS(supabaseAdmin, idInsumo, user.id, item.cantidad, usd);`);

// In editarFacturaInsumos:
content = content.replace(`const { data: newIns } = await supabase.from('inventario_insumos').insert({`, `const { data: newIns, error: insErr } = await supabaseAdmin.from('inventario_insumos').insert({`);
// wait, the first replace might have replaced both if I use global, but I didn't use global regex. Let's use regex for all.

fs.writeFileSync('patch_admin.js', `
const fs = require('fs');
let p = fs.readFileSync('src/actions/compras-actions.ts', 'utf8');

if (!p.includes('supabaseAdmin')) {
  p = p.replace("import { registrarAsiento } from './contabilidad-actions';", "import { registrarAsiento } from './contabilidad-actions';\\nimport { createClient as createAdminClient } from '@supabase/supabase-js';\\nconst supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);");
}

p = p.replace(/const \\{ error: rpcErr \\} = await registrarCompraInsumoJS\\(supabase,/g, "const { error: rpcErr } = await registrarCompraInsumoJS(supabaseAdmin,");

p = p.replace(/const \\{ data: newIns \\} = await supabase\\.from\\('inventario_insumos'\\)\\.insert/g, "const { data: newIns, error: insErr } = await supabaseAdmin.from('inventario_insumos').insert");

p = p.replace(/if \\(newIns\\) idInsumo = newIns\\.id;/g, "if (insErr) console.error('Error insertando nuevo insumo:', insErr);\\n      if (newIns) idInsumo = newIns.id;");

// In editarFacturaInsumos, old item stock adjustment:
p = p.replace(/await supabase\\.from\\('inventario_insumos'\\)\\.update\\(\\{ cantidad_actual: newCant \\}\\)\\.eq\\('id', oldItem\\.insumo_id\\);/g, "await supabaseAdmin.from('inventario_insumos').update({ cantidad_actual: newCant }).eq('id', oldItem.insumo_id);");

fs.writeFileSync('src/actions/compras-actions.ts', p);
console.log('✅ patched compras-actions.ts');
`);
