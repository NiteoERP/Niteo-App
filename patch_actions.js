const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/inventario/actions.ts', 'utf8');

code += "\nexport async function ajustarInventarioBatch(empresaId, adjustments) {\n  const supabase = await createClient();\n  let hasError = false;\n  for (const adj of adjustments) {\n    const { error } = await supabase\n      .from('inventario_insumos')\n      .update({ cantidad_actual: adj.cantidad_actual })\n      .eq('id', adj.id)\n      .eq('empresa_id', empresaId);\n    if (error) {\n      console.error(error);\n      hasError = true;\n    }\n  }\n  revalidatePath('/dashboard/inventario');\n  return { success: !hasError };\n}\n";

fs.writeFileSync('src/app/dashboard/inventario/actions.ts', code, 'utf8');
