'use server';

import { createClient } from '@/utils/supabase/server';
async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');
  
  const idEmpresa = user.app_metadata?.empresa_id || user.user_metadata?.empresa_id;
  if (!idEmpresa) throw new Error('Sin empresa asignada');
  
  return { supabase, user, idEmpresa };
}
import { revalidatePath } from 'next/cache';

export interface TransformacionItem {
  insumo_id: string;
  cantidad: number;
  costo_unitario?: number; // Sólo informativo
  porcentaje_costo?: number; // Para destinos
}

export async function ejecutarTransformacion(
  origenes: TransformacionItem[],
  destinos: TransformacionItem[],
  sedeId: string
) {
  try {
    const { supabase, idEmpresa, user } = await getAuthContext();

    // 1. Obtener costos actuales de los orígenes para calcular el costo total
    let costoTotalTransferido = 0;
    for (const origen of origenes) {
      const { data: insumo } = await supabase
        .from('inventario_insumos')
        .select('cantidad_actual, costo_promedio, nombre')
        .eq('id', origen.insumo_id)
        .single();
      
      if (!insumo) throw new Error(`Insumo origen no encontrado.`);
      if (insumo.cantidad_actual < origen.cantidad) {
        throw new Error(`Stock insuficiente para ${insumo.nombre}. Tienes ${insumo.cantidad_actual} pero intentas usar ${origen.cantidad}.`);
      }

      costoTotalTransferido += (insumo.costo_promedio || 0) * origen.cantidad;

      // Restar stock origen
      const nuevaCantidad = insumo.cantidad_actual - origen.cantidad;
      const { error: updErr } = await supabase.from('inventario_insumos').update({ cantidad_actual: nuevaCantidad }).eq('id', origen.insumo_id);
      if (updErr) throw updErr;

      // Registrar movimiento de salida
      await supabase.from('movimientos_inventario').insert({
        empresa_id: idEmpresa,
        insumo_id: origen.insumo_id,
        usuario_id: user.id,
        tipo_movimiento: 'SALIDA',
        motivo: 'AJUSTE_INVENTARIO', // Usamos este enum por defecto
        cantidad: origen.cantidad,
        costo_perdido: 0
      });
    }

    // 2. Distribuir el costo y sumar a los destinos
    for (const destino of destinos) {
      const { data: insumo } = await supabase
        .from('inventario_insumos')
        .select('cantidad_actual, costo_promedio')
        .eq('id', destino.insumo_id)
        .single();
        
      if (!insumo) continue;

      // Calcular cuánto costo le toca a este destino
      // Si no se especifica porcentaje, dividimos en partes iguales
      const porcentaje = destino.porcentaje_costo !== undefined 
        ? destino.porcentaje_costo / 100 
        : (1 / destinos.length);
        
      const costoAsignado = costoTotalTransferido * porcentaje;
      const costoUnitarioNuevo = costoAsignado / destino.cantidad;

      const cantActual = Number(insumo.cantidad_actual || 0);
      const costoProm = Number(insumo.costo_promedio || 0);
      
      const nuevaCantidad = cantActual + destino.cantidad;
      // Nuevo promedio de costo ponderado
      const nuevoCostoPromedio = nuevaCantidad > 0 
        ? ((cantActual * costoProm) + costoAsignado) / nuevaCantidad 
        : costoUnitarioNuevo;

      const { error: updErr2 } = await supabase.from('inventario_insumos').update({ 
        cantidad_actual: nuevaCantidad,
        costo_promedio: Number(nuevoCostoPromedio.toFixed(4))
      }).eq('id', destino.insumo_id);
      if (updErr2) throw updErr2;

      // Registrar movimiento de entrada
      await supabase.from('movimientos_inventario').insert({
        empresa_id: idEmpresa,
        insumo_id: destino.insumo_id,
        usuario_id: user.id,
        tipo_movimiento: 'ENTRADA',
        motivo: 'AJUSTE_INVENTARIO',
        cantidad: destino.cantidad,
        costo_perdido: 0
      });
    }

    revalidatePath('/dashboard/inventario');
    return { success: true };

  } catch (err: any) {
    return { error: err.message || 'Error al ejecutar transformación' };
  }
}

export async function guardarPlantillaTransformacion(
  nombre: string,
  origenes: TransformacionItem[],
  destinos: TransformacionItem[]
) {
  try {
    const { supabase, idEmpresa } = await getAuthContext();
    const { error } = await supabase.from('inventario_transformaciones_plantillas').insert({
      empresa_id: idEmpresa,
      nombre,
      insumos_origen: origenes,
      insumos_destino: destinos
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Error guardando plantilla' };
  }
}

export async function getPlantillasTransformacion() {
  try {
    const { supabase, idEmpresa } = await getAuthContext();
    const { data, error } = await supabase
      .from('inventario_transformaciones_plantillas')
      .select('*')
      .eq('empresa_id', idEmpresa)
      .order('nombre');
    
    if (error) throw error;
    return { success: true, plantillas: data || [] };
  } catch (err: any) {
    return { error: err.message, plantillas: [] };
  }
}

export async function eliminarPlantillaTransformacion(id: string) {
  try {
    const { supabase } = await getAuthContext();
    const { error } = await supabase
      .from('inventario_transformaciones_plantillas')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
