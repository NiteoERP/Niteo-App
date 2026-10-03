'use server';

import { createClient } from '@/utils/supabase/server';
import { randomUUID } from 'crypto';

export interface VentaCostoItem {
  insumoId: string;
  cantidad: number;
}

export async function registrarVentaAlCostoMulti(
  items: VentaCostoItem[],
  beneficiario: string,
  notas: string,
  empresaId: string,
  sedeId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Usuario no autenticado.' };
  }

  // 1. Validar privilegios del usuario (MASTER o con permiso_venta_costo)
  const isMaster = user.app_metadata?.user_role === 'MASTER';
  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol, permiso_venta_costo')
    .eq('id', user.id)
    .single();

  const hasPermission = isMaster || profile?.rol === 'MASTER' || profile?.permiso_venta_costo === true;

  if (!hasPermission) {
    return {
      success: false,
      error: 'No tienes el privilegio "Venta al Costo" habilitado. Contacta al usuario Master.'
    };
  }

  if (!items || items.length === 0) {
    return { success: false, error: 'Debe seleccionar al menos un insumo.' };
  }
  
  if (!beneficiario || beneficiario.trim() === '') {
    return { success: false, error: 'Debe especificar el beneficiario.' };
  }

  const operacionId = randomUUID();
  const cleanBeneficiario = beneficiario.replace(/\|/g, '-');
  const cleanNotas = (notas || '').replace(/\|/g, '-');
  const motivoPrefix = `VENTA_AL_COSTO|${operacionId}|${cleanBeneficiario}|${cleanNotas}`;

  for (const item of items) {
    // 2. Obtener insumo actual
    const { data: insumo, error: insumoErr } = await supabase
      .from('inventario_insumos')
      .select('id, costo_promedio, cantidad_actual')
      .eq('id', item.insumoId)
      .single();

    if (insumoErr || !insumo) continue;
    if (insumo.cantidad_actual < item.cantidad) {
       return { success: false, error: `Stock insuficiente para el insumo ID: ${item.insumoId}` };
    }

    const costoTotal = insumo.costo_promedio * item.cantidad;

    // 3. Deduce el stock en inventario_insumos
    const { error: updateErr } = await supabase
      .from('inventario_insumos')
      .update({
        cantidad_actual: insumo.cantidad_actual - item.cantidad,
        fecha_ultima_actualizacion: new Date().toISOString()
      })
      .eq('id', item.insumoId);

    if (updateErr) {
      return { success: false, error: `Error al actualizar inventario: ${updateErr.message}` };
    }

    // 4. Registrar movimiento de inventario con motivo especial
    await supabase
      .from('movimientos_inventario')
      .insert({
        empresa_id: empresaId,
        insumo_id: insumo.id,
        usuario_id: user.id,
        tipo_movimiento: 'SALIDA',
        cantidad: item.cantidad,
        costo_perdido: costoTotal,
        motivo: motivoPrefix,
        fecha_movimiento: new Date().toISOString(),
      });
  }

  return { success: true };
}

export interface VentaCostoOperacion {
  operacionId: string;
  beneficiario: string;
  notas: string;
  fecha_operacion: string;
  usuario_id: string;
  usuario_nombre?: string;
  costo_total: number;
  items: any[];
}

export async function getVentasCostoHistory(empresaId: string, sedeId?: string): Promise<VentaCostoOperacion[]> {
  const supabase = await createClient();

  let query = supabase
    .from('movimientos_inventario')
    .select('*, inventario_insumos!inner(nombre, unidad_medida, sede_id)')
    .eq('empresa_id', empresaId)
    .like('motivo', 'VENTA_AL_COSTO%')
    .order('fecha_movimiento', { ascending: false });

  if (sedeId) {
    query = query.eq('inventario_insumos.sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Mapear nombres de usuario
  const userIds = [...new Set(data.map((m: any) => m.usuario_id).filter(Boolean))];
  let userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('perfiles')
      .select('id, nombre_completo')
      .in('id', userIds);
    if (users) {
      userMap = users.reduce((acc: any, u: any) => {
        acc[u.id] = u.nombre_completo || 'Usuario';
        return acc;
      }, {});
    }
  }

  // Agrupar por operacionId
  const opsMap: Record<string, VentaCostoOperacion> = {};
  const singleItemOps: VentaCostoOperacion[] = []; // Para los VENTA_AL_COSTO antiguos

  for (const m of data) {
    const motivo = m.motivo || '';
    const parts = motivo.split('|');
    
    // Antiguo formato
    if (parts.length === 1 && parts[0] === 'VENTA_AL_COSTO') {
      singleItemOps.push({
        operacionId: m.id, // uuid del movimiento
        beneficiario: 'N/A',
        notas: '',
        fecha_operacion: m.fecha_movimiento,
        usuario_id: m.usuario_id,
        usuario_nombre: userMap[m.usuario_id] || 'Desconocido',
        costo_total: m.costo_perdido || 0,
        items: [
          {
            insumo_nombre: m.inventario_insumos?.nombre,
            cantidad: m.cantidad,
            unidad: m.inventario_insumos?.unidad_medida,
            costo: m.costo_perdido
          }
        ]
      });
      continue;
    }

    // Nuevo formato: VENTA_AL_COSTO|UUID|Beneficiario|Notas
    if (parts.length >= 3) {
      const opId = parts[1];
      const benef = parts[2];
      const notas = parts.slice(3).join('|');

      if (!opsMap[opId]) {
        opsMap[opId] = {
          operacionId: opId,
          beneficiario: benef,
          notas: notas,
          fecha_operacion: m.fecha_movimiento,
          usuario_id: m.usuario_id,
          usuario_nombre: userMap[m.usuario_id] || 'Desconocido',
          costo_total: 0,
          items: []
        };
      }
      opsMap[opId].costo_total += Number(m.costo_perdido || 0);
      opsMap[opId].items.push({
        insumo_nombre: m.inventario_insumos?.nombre,
        cantidad: m.cantidad,
        unidad: m.inventario_insumos?.unidad_medida,
        costo: m.costo_perdido
      });
    }
  }

  const result = [...Object.values(opsMap), ...singleItemOps];
  // Ordenar por fecha descendente
  result.sort((a, b) => new Date(b.fecha_operacion).getTime() - new Date(a.fecha_operacion).getTime());

  return result;
}
