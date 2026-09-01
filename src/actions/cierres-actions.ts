'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ============================================================================
// 1. OBTENER DATOS PREVIOS DEL SISTEMA PARA EL CIERRE
// ============================================================================
export async function getCierrePrevio(fechaStr: string, requestedSedeId?: string) {
  const supabase = await createClient();

  // Obtener la sesión y el perfil para saber la sede
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error("Perfil no encontrado");

  const targetSedeId = requestedSedeId || profile.sede_id;
  if (!targetSedeId) throw new Error("Debe seleccionar una sede para consultar el cierre");

  // 1. Consultar la Tasa de Cambio Automática (la más reciente)
  let tasaCambio = 36.50; // Valor de fallback
  const { data: tasaData } = await supabase
    .from('tasa_cambiaria')
    .select('tasa_bcv')
    .order('fecha', { ascending: false })
    .limit(1)
    .single();
    
  if (tasaData && tasaData.tasa_bcv) {
    tasaCambio = Number(tasaData.tasa_bcv);
  }

  // 2. Sumar Ventas del Día (de Niteo Sync)
  const { data: ventasData } = await supabase
    .from('ventas_facturas')
    .select('total')
    .eq('sede_id', targetSedeId)
    .gte('fecha_venta', `${fechaStr}T00:00:00.000Z`)
    .lte('fecha_venta', `${fechaStr}T23:59:59.999Z`);
  
  const ventasTotales = ventasData ? ventasData.reduce((acc, curr) => acc + Number(curr.total), 0) : 0;

  // 3. Sumar Gastos Operativos del Día
  const { data: gastosData } = await supabase
    .from('gastos_sede')
    .select('monto')
    .eq('sede_id', targetSedeId)
    .gte('fecha_gasto', `${fechaStr}T00:00:00.000Z`)
    .lte('fecha_gasto', `${fechaStr}T23:59:59.999Z`);
  
  const gastosTotales = gastosData ? gastosData.reduce((acc, curr) => acc + Number(curr.monto), 0) : 0;

  // Total Esperado por el Sistema = Ventas - Gastos
  const totalEsperado = ventasTotales - gastosTotales;

  return {
    tasaCambio,
    ventasTotales,
    gastosTotales,
    totalEsperado,
    targetSedeId
  };
}

// ============================================================================
// 2. GUARDAR EL CIERRE Y LAS TRANSACCIONES BANCARIAS
// ============================================================================
export async function guardarCierre(cierreData: any, transacciones: any[]) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const finalSedeId = cierreData.sede_id || profile.sede_id;
  if (!finalSedeId) return { error: "No se especificó la sede para el cierre." };

  // 1. Insertar en la Tabla Maestra (cierres_caja)
  const { data: nuevoCierre, error: errorCierre } = await supabase
      .from('cierres_caja')
    .insert({
      empresa_id: profile.empresa_id,
      sede_id: finalSedeId,
      usuario_id: user.id,
      fecha_cierre: cierreData.fecha_cierre,
      tasa_cambio: cierreData.tasa_cambio,
      sistema_ventas_brutas: cierreData.sistema_ventas_brutas,
      sistema_gastos_operativos: cierreData.sistema_gastos_operativos,
      sistema_total_esperado: cierreData.sistema_total_esperado,
      real_efectivo_bs: cierreData.real_efectivo_bs,
      real_efectivo_usd: cierreData.real_efectivo_usd,
      real_bancos_bs: cierreData.real_bancos_bs,
      real_bancos_usd: cierreData.real_bancos_usd,
      diferencia_total: cierreData.diferencia_total
    })
    .select('id')
    .single();

  if (errorCierre) {
    console.error('Error insertando cierre:', errorCierre);
    // Verificar si es error de constraint unique (ya cerró hoy)
    if (errorCierre.code === '23505') {
       return { error: 'Ya existe un cierre de caja registrado para esta fecha y sede.' };
    }
    return { error: 'Error al registrar el resumen del cierre. Detalles: ' + errorCierre.message + ' ' + (errorCierre.details || '') };
  }

  // 2. Insertar las Transacciones Bancarias (Bulk Insert) si hay alguna
  if (transacciones.length > 0) {
    const transaccionesConId = transacciones.map(t => ({
      cierre_id: nuevoCierre.id,
      metodo: t.metodo,
      banco: t.banco,
      referencia: t.referencia,
      monto: t.monto,
      moneda: t.moneda
    }));

    const { error: errorTransacciones } = await supabase
        .from('cierres_transacciones')
      .insert(transaccionesConId);

    if (errorTransacciones) {
      console.error('Error insertando transacciones:', errorTransacciones);
      // Opcional: Aquí se podría hacer un rollback borrando el cierre, pero dejemos el log por ahora
      return { error: 'El cierre guardó el resumen, pero hubo un error guardando el detalle de los bancos.' };
    }
  }

  revalidatePath('/dashboard/cierre');
  return { success: true };
}




export async function getBancosUtilizados() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return [];
  
  // Try to get distinct bancos used by this empresa
  // Since Supabase RPC or distinct might not be trivial without a custom function, we just fetch a subset of unique ones via a simple query
  const { data, error } = await supabase
    .from('cierres_transacciones')
    .select('banco')
    .not('banco', 'is', null)
    .eq('empresa_id', profile.empresa_id)
    .limit(100);
    
  if (error || !data) return ['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'BNC'];
  
  const bancos = Array.from(new Set(data.map(d => d.banco))).filter(Boolean);
  if (bancos.length === 0) return ['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'BNC'];
  return bancos;
}

// ============================================================================
// 3. OBTENER HISTORIAL DE CIERRES
// ============================================================================
export async function getHistorialCierres(sedeId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('perfiles').select('empresa_id, sede_id, rol').eq('id', user.id).single();
  if (!profile) return [];

  let query = supabase
    .from('cierres_caja')
    .select('*, sedes(nombre_sede), usuarios(nombre)')
    .eq('empresa_id', profile.empresa_id)
    .order('fecha_cierre', { ascending: false });

  // Si no es MASTER, forzar su sede
  if (profile.rol !== 'MASTER') {
    query = query.eq('sede_id', profile.sede_id);
  } else if (sedeId && sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return [];
  }
  return data || [];
}