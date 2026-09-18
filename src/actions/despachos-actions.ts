'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function procesarDespachoEnServidor(
  empresaId: string,
  origenId: string,
  destinoId: string,
  notas: string,
  items: { insumo_id: string, nombre: string, unidad_medida: string, cantidad: number }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    // 1. Create Despacho header
    const { data: cabecera, error: cabErr } = await supabase.from('despachos').insert({
      empresa_id: empresaId,
      sede_origen_id: origenId,
      sede_destino_id: destinoId,
      usuario_id: user.id,
      notas,
      estado: 'EN_TRANSITO' // PASO 1: En tránsito
    }).select().single();

    if (cabErr) throw cabErr;

    // 2. Loop through items
    for (const item of items) {
      const { data: originItem, error: errOrg } = await supabase.from('inventario_insumos')
        .select('id, cantidad_actual, costo_promedio')
        .eq('id', item.insumo_id)
        .single();
      
      if (errOrg || !originItem) throw new Error(`Insumo origen no encontrado: ${item.nombre}`);
      if (originItem.cantidad_actual < item.cantidad) {
        throw new Error(`Stock insuficiente para ${item.nombre} en la sede origen.`);
      }

      // 3. Deduct from origin ONLY
      const newOriginQty = originItem.cantidad_actual - item.cantidad;
      const { error: updErr } = await supabase.from('inventario_insumos').update({
        cantidad_actual: newOriginQty
      }).eq('id', originItem.id);
      
      if (updErr) throw updErr;

      // Register origin movement
      await supabase.from('movimientos_inventario').insert({
        empresa_id: empresaId,
        sede_id: origenId,
        insumo_id: originItem.id,
        usuario_id: user.id,
        tipo_movimiento: 'SALIDA',
        cantidad: item.cantidad,
        costo_perdido: 0,
        motivo: 'DESPACHO_SALIDA',
        fecha_movimiento: new Date().toISOString()
      });

      // 4. Insert Dispatch Detail (save costo_transferencia)
      await supabase.from('despachos_items').insert({
        despacho_id: cabecera.id,
        insumo_id: originItem.id,
        nombre: item.nombre,
        cantidad: item.cantidad,
        unidad_medida: item.unidad_medida,
        costo_transferencia: originItem.costo_promedio // Lock in the cost
      });
    }

    revalidatePath('/dashboard/despachos');
    revalidatePath('/dashboard/inventario');
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function recibirDespachoEnServidor(
  despachoId: string,
  itemsRecibidos: { item_id: string, cantidad_recibida: number }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    const { data: despacho } = await supabase.from('despachos')
      .select('*')
      .eq('id', despachoId)
      .single();

    if (!despacho) throw new Error('Despacho no encontrado');
    if (despacho.estado === 'COMPLETADO') throw new Error('El despacho ya fue recibido');

    const { data: originalItems } = await supabase.from('despachos_items')
      .select('*')
      .eq('despacho_id', despachoId);

    if (!originalItems) throw new Error('Items no encontrados');

    for (const original of originalItems) {
      const received = itemsRecibidos.find(i => i.item_id === original.id);
      if (!received) continue;

      const qtyReceived = Number(received.cantidad_recibida);
      const qtySent = Number(original.cantidad);
      const costTransfer = Number(original.costo_transferencia || 0);
      
      // Update the item record
      await supabase.from('despachos_items')
        .update({ cantidad_recibida: qtyReceived })
        .eq('id', original.id);

      // Handle Destination Addition
      if (qtyReceived > 0) {
        const { data: destItems } = await supabase.from('inventario_insumos')
          .select('id, cantidad_actual, costo_promedio')
          .eq('sede_id', despacho.sede_destino_id)
          .eq('nombre', original.nombre)
          .eq('empresa_id', despacho.empresa_id);

        let destItem = destItems && destItems.length > 0 ? destItems[0] : null;

        if (destItem) {
          const newDestQty = destItem.cantidad_actual + qtyReceived;
          const oldTotalValue = destItem.cantidad_actual * destItem.costo_promedio;
          const transferValue = qtyReceived * costTransfer;
          let newAvgCost = (oldTotalValue + transferValue) / newDestQty;
          if (isNaN(newAvgCost) || newDestQty === 0) newAvgCost = costTransfer;

          await supabase.from('inventario_insumos').update({
            cantidad_actual: newDestQty,
            costo_promedio: newAvgCost
          }).eq('id', destItem.id);

        } else {
          const { data: newDest } = await supabase.from('inventario_insumos').insert({
            empresa_id: despacho.empresa_id,
            sede_id: despacho.sede_destino_id,
            nombre: original.nombre,
            unidad_medida: original.unidad_medida,
            cantidad_actual: qtyReceived,
            costo_promedio: costTransfer
          }).select().single();
          destItem = newDest;
        }

        await supabase.from('movimientos_inventario').insert({
          empresa_id: despacho.empresa_id,
          sede_id: despacho.sede_destino_id,
          insumo_id: destItem!.id,
          usuario_id: user.id,
          tipo_movimiento: 'ENTRADA',
          cantidad: qtyReceived,
          costo_perdido: 0,
          motivo: 'DESPACHO_ENTRADA',
          fecha_movimiento: new Date().toISOString()
        });
      }

      // Handle Difference (Return to origin)
      const diff = qtySent - qtyReceived;
      if (diff > 0 && original.insumo_id) {
        const { data: originItem } = await supabase.from('inventario_insumos')
          .select('id, cantidad_actual')
          .eq('id', original.insumo_id)
          .single();
        
        if (originItem) {
          await supabase.from('inventario_insumos')
            .update({ cantidad_actual: originItem.cantidad_actual + diff })
            .eq('id', original.insumo_id);

          await supabase.from('movimientos_inventario').insert({
            empresa_id: despacho.empresa_id,
            sede_id: despacho.sede_origen_id,
            insumo_id: original.insumo_id,
            usuario_id: user.id,
            tipo_movimiento: 'ENTRADA', // Return
            cantidad: diff,
            costo_perdido: 0,
            motivo: 'AJUSTE_INVENTARIO', // or 'DEVOLUCION_DESPACHO'
            fecha_movimiento: new Date().toISOString()
          });
        }
      }
    }

    // Finish Despacho
    await supabase.from('despachos').update({
      estado: 'COMPLETADO',
      usuario_recepcion_id: user.id,
      fecha_recepcion: new Date().toISOString()
    }).eq('id', despachoId);

    revalidatePath('/dashboard/despachos/historial');
    revalidatePath('/dashboard/despachos');
    revalidatePath('/dashboard/inventario');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
