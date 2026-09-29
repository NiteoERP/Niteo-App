const fs = require('fs');
const file = 'c:/Users/Usuario/Documents/Niteo App/niteo-web/src/actions/catalogo-actions.ts';
let code = fs.readFileSync(file, 'utf8');

// Patch createProducto
code = code.replace(
  /      if \(inserts\.length > 0\) \{\n        await supabase\.from\('recetas'\)\.insert\(inserts\);\n      \}\n    \}\n\n    revalidatePath\('\/dashboard\/catalogo'\);\n    revalidatePath\('\/dashboard\/inventario'\);\n    return \{ success: true \};\n  \}/g,
  `      if (inserts.length > 0) {
        await supabase.from('recetas').insert(inserts);
      }
    }

    if (Array.isArray(data.precios_dinamicos) && data.precios_dinamicos.length > 0) {
      const preciosInserts = data.precios_dinamicos.map((p: any) => ({
        producto_id: nuevoProd.id,
        lista_precio_id: p.lista_precio_id,
        precio: parseFloat(p.precio) || 0
      }));
      await supabase.from('productos_precios').insert(preciosInserts);
    }

    revalidatePath('/dashboard/catalogo');
    revalidatePath('/dashboard/inventario');
    return { success: true };
  }`
);

// Patch updateProducto
code = code.replace(
  /      if \(inserts\.length > 0\) \{\n        await supabase\.from\('recetas'\)\.insert\(inserts\);\n      \}\n    \}\n\n    revalidatePath\('\/dashboard\/catalogo'\);\n    return \{ success: true \};\n  \}/g,
  `      if (inserts.length > 0) {
        await supabase.from('recetas').insert(inserts);
      }
    }

    if (Array.isArray(data.precios_dinamicos)) {
      await supabase.from('productos_precios').delete().eq('producto_id', id);
      if (data.precios_dinamicos.length > 0) {
        const preciosInserts = data.precios_dinamicos.map((p: any) => ({
          producto_id: id,
          lista_precio_id: p.lista_precio_id,
          precio: parseFloat(p.precio) || 0
        }));
        await supabase.from('productos_precios').insert(preciosInserts);
      }
    }

    revalidatePath('/dashboard/catalogo');
    return { success: true };
  }`
);

fs.writeFileSync(file, code);
