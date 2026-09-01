const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

code = code.replace(
  /return \{ error: 'El cierre guardó el resumen, pero hubo un error guardando el detalle de los bancos\.' \};/,
  `return { error: 'El cierre guardó el resumen, pero hubo un error guardando los bancos. Detalles: ' + errorTransacciones.message + ' ' + (errorTransacciones.details || '') };`
);

// We need to also delete the 'cierre' if transacciones fail so they don't get stuck with a broken summary
// Wait, if it fails, they will have a closure for today, so they can't submit it again!
// We should delete the closure!
code = code.replace(
  /if \(errorTransacciones\) \{\n\s*console\.error\('Error insertando transacciones:', errorTransacciones\);\n\s*return \{ error: 'El cierre guardó el resumen, pero hubo un error guardando los bancos\. Detalles: ' \+ errorTransacciones\.message \+ ' ' \+ \(errorTransacciones\.details \|\| ''\) \};\n\s*\}/,
  `if (errorTransacciones) {
        console.error('Error insertando transacciones:', errorTransacciones);
        // Delete the orphaned summary so they can retry
        await supabase.from('cierres_caja').delete().eq('id', nuevoCierre.id);
        return { error: 'El cierre falló en el detalle de bancos. Reintente. Detalles: ' + errorTransacciones.message + ' ' + (errorTransacciones.details || '') };
      }`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
