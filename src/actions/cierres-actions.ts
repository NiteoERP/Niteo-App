'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ============================================================================
// 1. OBTENER DATOS PREVIOS DEL SISTEMA PARA EL CIERRE
// ============================================================================
export async function getCierrePrevio(fechaStr: string) {
  const supabase = await createClient();

  // Obtener la sesiÃ³n y el perfil para saber la sede
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from('perfiles')
    .select('id_empresa, id_sede')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error("Perfil no encontrado");

  // 1. Consultar la Tasa de Cambio AutomÃ¡tica del DÃ­a
  // Asumimos que existe una tabla 'tasas_cambio' o tomamos un valor por defecto seguro
  let tasaCambio = 40.00; // Valor de fallback
  const { data: tasaData } = await supabase
    .from('tasas_cambio')
    .select('tasa')
    .eq('fecha', fechaStr)
    .limit(1)
    .maybeSingle();
  
  if (tasaData) {
    tasaCambio = tasaData.tasa;
  }

  // 2. Sumar Ventas del DÃ­a (de Niteo Sync)
  const { data: ventasData } = await supabase
    .from('ventas_facturas')
    .select('total')
    .eq('id_sede', profile.id_sede)
    .gte('fecha_venta', `${fechaStr}T00:00:00.000Z`)
    .lte('fecha_venta', `${fechaStr}T23:59:59.999Z`);
  
  const ventasTotales = ventasData ? ventasData.reduce((acc, curr) => acc + Number(curr.total), 0) : 0;

  // 3. Sumar Gastos Operativos del DÃ­a
  const { data: gastosData } = await supabase
    .from('gastos_sede')
    .select('monto')
    .eq('id_sede', profile.id_sede)
    .gte('fecha_gasto', `${fechaStr}T00:00:00.000Z`)
    .lte('fecha_gasto', `${fechaStr}T23:59:59.999Z`);
  
  const gastosTotales = gastosData ? gastosData.reduce((acc, curr) => acc + Number(curr.monto), 0) : 0;

  // Total Esperado por el Sistema = Ventas - Gastos
  const totalEsperado = ventasTotales - gastosTotales;

  return {
    tasaCambio,
    ventasTotales,
    gastosTotales,
    totalEsperado
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
    .select('id_empresa, id_sede')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  // 1. Insertar en la Tabla Maestra (cierres_caja)
  const { data: nuevoCierre, error: errorCierre } = await supabase
    .from('cierres_caja')
    .insert({
      id_empresa: profile.id_empresa,
      id_sede: profile.id_sede,
      id_usuario: user.id,
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
    // Verificar si es error de constraint unique (ya cerrÃ³ hoy)
    if (errorCierre.code === '23505') {
       return { error: 'Ya existe un cierre de caja registrado para esta fecha y sede.' };
    }
    return { error: 'Error al registrar el resumen del cierre.' };
  }

  // 2. Insertar las Transacciones Bancarias (Bulk Insert) si hay alguna
  if (transacciones.length > 0) {
    const transaccionesConId = transacciones.map(t => ({
      id_cierre: nuevoCierre.id,
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
      // Opcional: AquÃ­ se podrÃ­a hacer un rollback borrando el cierre, pero dejemos el log por ahora
      return { error: 'El cierre guardÃ³ el resumen, pero hubo un error guardando el detalle de los bancos.' };
    }
  }

  revalidatePath('/dashboard/cierre');
  return { success: true };
}

