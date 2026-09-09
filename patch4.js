const fs = require('fs');
let p = fs.readFileSync('src/actions/compras-actions.ts', 'utf8');

const targetStr = `if (headErr) return { error: 'Error guardando factura: ' + headErr.message };`;

const logicToInsert = `if (headErr) return { error: 'Error guardando factura: ' + headErr.message };    

    // == LÓGICA DE PROVEEDORES Y DEUDAS ==
    const isDeuda = factura.metodo_pago?.toLowerCase().includes('por pagar');
    if (isDeuda && factura.proveedor) {
      let provId = null;
      const { data: existProv } = await supabase.from('proveedores')
        .select('id').eq('empresa_id', profile.empresa_id).ilike('nombre_comercial', factura.proveedor.trim()).single();
      
      if (existProv) {
        provId = existProv.id;
      } else {
        const { data: newProv } = await supabase.from('proveedores').insert({
          empresa_id: profile.empresa_id,
          nombre_comercial: factura.proveedor.trim(),
          estado_activo: true
        }).select('id').single();
        if (newProv) provId = newProv.id;
      }

      if (provId) {
        await supabase.from('compras_facturas').insert({
          empresa_id: profile.empresa_id,
          sede_id: activeSedeId,
          proveedor_id: provId,
          numero_factura: 'S/N',
          concepto: factura.descripcion?.trim() ? factura.descripcion : \`Compra Insumos (\${factura.items.length} items)\`,
          total: montoTotalDivisas,
          saldo_pendiente: montoTotalDivisas,
          fecha_emision: new Date().toISOString(),
          usuario_id: user.id
        });
      }
    }
    // == FIN LÓGICA DE PROVEEDORES ==`;

p = p.replace(targetStr, logicToInsert);

fs.writeFileSync('src/actions/compras-actions.ts', p);
console.log('✅ compras-actions.ts patched with debt logic');
