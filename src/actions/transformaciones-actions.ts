'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('No autorizado');
  
  let idEmpresa = user.app_metadata?.empresa_id || user.user_metadata?.empresa_id;
  if (!idEmpresa) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('perfiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();
    idEmpresa = profile?.empresa_id;
  }
  if (!idEmpresa) throw new Error('Sin empresa asignada');
  
  return { supabase, user, idEmpresa };
}

export interface TransformacionItem {
  insumo_id: string;
  cantidad: number | string;
  costo_unitario?: number | string; // Sólo informativo
  porcentaje_costo?: number | string; // Para destinos
  nombre_insumo?: string;
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
      const cantOrigen = parseFloat(String(origen.cantidad)) || 0;
      if (cantOrigen <= 0) continue;

      const { data: insumo } = await supabase
        .from('inventario_insumos')
        .select('cantidad_actual, costo_promedio, nombre')
        .eq('id', origen.insumo_id)
        .single();
      
      if (!insumo) throw new Error(`Insumo origen no encontrado.`);
      const cantActual = parseFloat(String(insumo.cantidad_actual || 0));
      if (cantActual < cantOrigen) {
        throw new Error(`Stock insuficiente para ${insumo.nombre}. Tienes ${cantActual} pero intentas usar ${cantOrigen}.`);
      }

      const costoProm = parseFloat(String(insumo.costo_promedio || 0));
      costoTotalTransferido += costoProm * cantOrigen;

      // Restar stock origen preservando decimales
      const nuevaCantidad = Number((cantActual - cantOrigen).toFixed(4));
      const { error: updErr } = await supabase
        .from('inventario_insumos')
        .update({ cantidad_actual: nuevaCantidad })
        .eq('id', origen.insumo_id);
      if (updErr) throw updErr;

      // Registrar movimiento de salida
      await supabase.from('movimientos_inventario').insert({
        empresa_id: idEmpresa,
        insumo_id: origen.insumo_id,
        usuario_id: user.id,
        tipo_movimiento: 'SALIDA',
        motivo: 'AJUSTE_INVENTARIO',
        cantidad: cantOrigen,
        costo_perdido: 0
      });
    }

    // 2. Distribuir el costo y sumar a los destinos
    const validDestinos = destinos.filter(d => (parseFloat(String(d.cantidad)) || 0) > 0 && d.insumo_id);

    for (const destino of validDestinos) {
      const cantDestino = parseFloat(String(destino.cantidad)) || 0;

      const { data: insumo } = await supabase
        .from('inventario_insumos')
        .select('cantidad_actual, costo_promedio')
        .eq('id', destino.insumo_id)
        .single();
        
      if (!insumo) continue;

      // Calcular cuánto costo le toca a este destino
      const porcentaje = destino.porcentaje_costo !== undefined 
        ? (parseFloat(String(destino.porcentaje_costo)) || 0) / 100 
        : (1 / validDestinos.length);
        
      const costoAsignado = costoTotalTransferido * porcentaje;
      const costoUnitarioNuevo = cantDestino > 0 ? costoAsignado / cantDestino : 0;

      const cantActual = parseFloat(String(insumo.cantidad_actual || 0));
      const costoProm = parseFloat(String(insumo.costo_promedio || 0));
      
      const nuevaCantidad = Number((cantActual + cantDestino).toFixed(4));
      // Nuevo promedio de costo ponderado
      const nuevoCostoPromedio = nuevaCantidad > 0 
        ? ((cantActual * costoProm) + costoAsignado) / nuevaCantidad 
        : costoUnitarioNuevo;

      const { error: updErr2 } = await supabase
        .from('inventario_insumos')
        .update({ 
          cantidad_actual: nuevaCantidad,
          costo_promedio: Number(nuevoCostoPromedio.toFixed(4))
        })
        .eq('id', destino.insumo_id);
      if (updErr2) throw updErr2;

      // Registrar movimiento de entrada
      await supabase.from('movimientos_inventario').insert({
        empresa_id: idEmpresa,
        insumo_id: destino.insumo_id,
        usuario_id: user.id,
        tipo_movimiento: 'ENTRADA',
        motivo: 'AJUSTE_INVENTARIO',
        cantidad: cantDestino,
        costo_perdido: 0
      });
    }

    revalidatePath('/dashboard/inventario');
    return { success: true };

  } catch (err: any) {
    console.error('Error al ejecutar transformación:', err);
    return { error: err.message || 'Error al ejecutar transformación' };
  }
}

export async function guardarPlantillaTransformacion(
  nombre: string,
  origenes: TransformacionItem[],
  destinos: TransformacionItem[],
  id?: string
) {
  try {
    const { supabase, idEmpresa } = await getAuthContext();

    // Normalizar items con números flotantes limpios
    const cleanOrigenes = origenes.map(o => ({
      ...o,
      cantidad: parseFloat(String(o.cantidad).replace(',', '.')) || 0,
      costo_unitario: o.costo_unitario !== undefined ? parseFloat(String(o.costo_unitario)) : undefined
    }));

    const cleanDestinos = destinos.map(d => ({
      ...d,
      cantidad: parseFloat(String(d.cantidad).replace(',', '.')) || 0,
      porcentaje_costo: d.porcentaje_costo !== undefined ? parseFloat(String(d.porcentaje_costo).replace(',', '.')) : undefined
    }));

    if (id) {
      // Actualizar plantilla existente
      let { error } = await supabase
        .from('inventario_transformaciones_plantillas')
        .update({
          nombre,
          insumos_origen: cleanOrigenes,
          insumos_destino: cleanDestinos
        })
        .eq('id', id)
        .eq('empresa_id', idEmpresa);

      if (error) {
        console.warn('Fallback a adminClient para actualizar plantilla:', error);
        const admin = createAdminClient();
        const res = await admin
          .from('inventario_transformaciones_plantillas')
          .update({
            nombre,
            insumos_origen: cleanOrigenes,
            insumos_destino: cleanDestinos
          })
          .eq('id', id)
          .eq('empresa_id', idEmpresa);
        error = res.error;
      }

      if (error) throw error;
      return { success: true, updated: true };
    } else {
      // Crear nueva plantilla
      let { data, error } = await supabase
        .from('inventario_transformaciones_plantillas')
        .insert({
          empresa_id: idEmpresa,
          nombre,
          insumos_origen: cleanOrigenes,
          insumos_destino: cleanDestinos
        })
        .select()
        .single();

      if (error) {
        console.warn('Fallback a adminClient para guardar plantilla:', error);
        const admin = createAdminClient();
        const res = await admin
          .from('inventario_transformaciones_plantillas')
          .insert({
            empresa_id: idEmpresa,
            nombre,
            insumos_origen: cleanOrigenes,
            insumos_destino: cleanDestinos
          })
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      return { success: true, plantilla: data };
    }
  } catch (err: any) {
    console.error('Error guardando plantilla:', err);
    return { error: err.message || 'Error guardando plantilla' };
  }
}

export async function getPlantillasTransformacion() {
  try {
    const { supabase, idEmpresa } = await getAuthContext();
    let { data, error } = await supabase
      .from('inventario_transformaciones_plantillas')
      .select('*')
      .eq('empresa_id', idEmpresa)
      .order('nombre');
    
    if (error) {
      console.warn('Fallback a adminClient para consultar plantillas:', error);
      const admin = createAdminClient();
      const res = await admin
        .from('inventario_transformaciones_plantillas')
        .select('*')
        .eq('empresa_id', idEmpresa)
        .order('nombre');
      data = res.data;
      error = res.error;
    }

    if (error) throw error;
    return { success: true, plantillas: data || [] };
  } catch (err: any) {
    console.error('Error obteniendo plantillas:', err);
    return { error: err.message, plantillas: [] };
  }
}

export async function eliminarPlantillaTransformacion(id: string) {
  try {
    const { supabase, idEmpresa } = await getAuthContext();
    let { error } = await supabase
      .from('inventario_transformaciones_plantillas')
      .delete()
      .eq('id', id)
      .eq('empresa_id', idEmpresa);

    if (error) {
      console.warn('Fallback a adminClient para eliminar plantilla:', error);
      const admin = createAdminClient();
      const res = await admin
        .from('inventario_transformaciones_plantillas')
        .delete()
        .eq('id', id)
        .eq('empresa_id', idEmpresa);
      error = res.error;
    }

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error eliminando plantilla:', err);
    return { error: err.message || 'Error eliminando plantilla' };
  }
}
