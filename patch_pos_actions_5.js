const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

const oldLogic = `  // Obtenemos inicio del día actual (opcional, si se quiere todo el historial quitar el gte)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: ventas, error } = await supabase
    .from('ventas_facturas')
    .select(\`
      *,
      ventas_detalles (
        id,
        id_producto,
        cantidad,
        precio_unitario,
        total,
        productos (
          nombre,
          codigo_barras
        )
      )
    \`)
    .eq('sede_id', sedeId)
    .gte('fecha_venta', today.toISOString())
    .order('fecha_venta', { ascending: false })
    .limit(50);`;

const newLogic = `  const { data: ventas, error } = await supabase
    .from('ventas_facturas')
    .select(\`
      *,
      ventas_detalles (
        id,
        id_producto,
        cantidad,
        precio_unitario,
        total,
        productos (
          nombre,
          codigo_barras
        )
      )
    \`)
    .eq('sede_id', sedeId)
    .order('fecha_venta', { ascending: false })
    .limit(50);`;

// Wait, the comment might have different encoding (día vs da). I'll use regex.
const regex = /\/\/ Obtenemos inicio del d.*?\s+const today.*?\s+today.setHours.*?\s+const \{ data: ventas, error \} = await supabase[\s\S]*?\.eq\('sede_id', sedeId\)\s*\.gte\('fecha_venta', today\.toISOString\(\)\)\s*\.order\('fecha_venta', \{ ascending: false \}\)\s*\.limit\(50\);/;

const replacement = `const { data: ventas, error } = await supabase
    .from('ventas_facturas')
    .select(\`
      *,
      ventas_detalles (
        id,
        id_producto,
        cantidad,
        precio_unitario,
        total,
        productos (
          nombre,
          codigo_barras
        )
      )
    \`)
    .eq('sede_id', sedeId)
    .order('fecha_venta', { ascending: false })
    .limit(50);`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
  console.log("Patched successfully");
} else {
  console.log("Regex didn't match");
}
