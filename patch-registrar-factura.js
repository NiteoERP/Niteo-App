const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/actions.ts', 'utf-8');

const regex = /for \(const p of productosFactura\) \{[\s\S]*?revalidatePath\('\/dashboard\/compras'\);/s;

const replacement = `for (const p of productosFactura) {
      if (p.id_producto) {
        const nuevoCostoUnitario = Number(p.precio); 
        const cantidadComprada = Number(p.cantidad);

        // 1. Obtener el stock actual y costo actual del insumo
        const { data: insData } = await supabase
          .from('inventario_insumos')
          .select('cantidad_actual, costo_promedio')
          .eq('id', p.id_producto)
          .eq('empresa_id', idEmpresa)
          .single();

        const stockActual = insData?.cantidad_actual ? Number(insData.cantidad_actual) : 0;
        const costoAnterior = insData?.costo_promedio ? Number(insData.costo_promedio) : 0;
        const nuevoStock = stockActual + cantidadComprada;

        // 2. Calcular el nuevo costo promedio ponderado
        const costoTotalAnterior = stockActual * costoAnterior;
        const costoTotalCompra = cantidadComprada * nuevoCostoUnitario;
        const nuevoCostoPromedio = nuevoStock > 0 
          ? (costoTotalAnterior + costoTotalCompra) / nuevoStock 
          : nuevoCostoUnitario;

        // 3. Actualizar el insumo
        await supabase
          .from('inventario_insumos')
          .update({ 
            cantidad_actual: nuevoStock,
            costo_promedio: Number(nuevoCostoPromedio.toFixed(4))
          })
          .eq('id', p.id_producto)
          .eq('empresa_id', idEmpresa);
          
        // 4. Registrar movimiento de inventario
        await supabase.from('movimientos_inventario').insert({
          empresa_id: idEmpresa,
          insumo_id: p.id_producto,
          usuario_id: user.id,
          tipo_movimiento: 'ENTRADA',
          motivo: 'AJUSTE_INVENTARIO',
          cantidad: cantidadComprada,
          costo_perdido: 0
        });
      }
    }

    revalidatePath('/dashboard/compras');`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/compras/actions.ts', code);
