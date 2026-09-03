'use server';

import { createClient } from '@/utils/supabase/server';

export interface MovimientoContable {
  codigo_cuenta: string;
  debe: number;
  haber: number;
}

export async function registrarAsiento(
  empresa_id: string,
  fecha: string,
  concepto: string,
  origen_tipo: string,
  origen_id: string,
  creado_por: string,
  movimientos: MovimientoContable[]
) {
  const supabase = await createClient();

  if (!movimientos || movimientos.length === 0) {
    return { success: false, error: 'No se enviaron movimientos contables.' };
  }

  const codigos = Array.from(new Set(movimientos.map(m => m.codigo_cuenta)));

  const { data: cuentas, error: errCuentas } = await supabase
    .from('contabilidad_cuentas')
    .select('id, codigo')
    .eq('empresa_id', empresa_id)
    .in('codigo', codigos);

  if (errCuentas) {
    console.error('Error al buscar cuentas contables:', errCuentas);
    return { success: false, error: 'Error al verificar catálogo de cuentas.' };
  }

  const mapCuentas = new Map<string, string>();
  cuentas?.forEach(c => mapCuentas.set(c.codigo, c.id));

  const cuentasFaltantes = codigos.filter(cod => !mapCuentas.has(cod));
  if (cuentasFaltantes.length > 0) {
    return { 
      success: false, 
      error: `Las siguientes cuentas no existen en el catálogo: ${cuentasFaltantes.join(', ')}` 
    };
  }

  const payloadMovimientos = movimientos.map(m => ({
    cuenta_id: mapCuentas.get(m.codigo_cuenta),
    debe: m.debe,
    haber: m.haber
  }));

  const { data: asientoId, error: errRpc } = await supabase.rpc('fn_registrar_asiento', {
    p_empresa_id: empresa_id,
    p_fecha: fecha,
    p_concepto: concepto,
    p_origen_tipo: origen_tipo,
    p_origen_id: origen_id,
    p_creado_por: creado_por,
    p_movimientos: payloadMovimientos
  });

  if (errRpc) {
    console.error('Error en RPC fn_registrar_asiento:', errRpc);
    return { success: false, error: errRpc.message };
  }

  return { success: true, asientoId };
}

export async function getLibroMayor(empresaId: string, cuentaId: string | null, fechaInicio?: string, fechaFin?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('contabilidad_movimientos')
    .select(`
      debe, haber,
      contabilidad_asientos!inner(fecha, concepto, origen_tipo),
      contabilidad_cuentas!inner(codigo, nombre)
    `)
    .eq('empresa_id', empresaId)
    .order('fecha', { foreignTable: 'contabilidad_asientos', ascending: false });

  if (cuentaId) {
    query = query.eq('cuenta_id', cuentaId);
  }
  if (fechaInicio) {
    query = query.gte('contabilidad_asientos.fecha', fechaInicio);
  }
  if (fechaFin) {
    query = query.lte('contabilidad_asientos.fecha', fechaFin);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error en getLibroMayor:', error);
    return [];
  }
  return data;
}

export async function getEstadoResultados(empresaId: string, fechaInicio: string, fechaFin: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contabilidad_movimientos')
    .select(`
      debe, haber,
      contabilidad_cuentas!inner(codigo, nombre, tipo),
      contabilidad_asientos!inner(fecha)
    `)
    .eq('empresa_id', empresaId)
    .gte('contabilidad_asientos.fecha', fechaInicio)
    .lte('contabilidad_asientos.fecha', fechaFin);

  if (error) {
    console.error('Error en getEstadoResultados:', error);
    return { ingresos: 0, costos: 0, gastos: 0, utilidad: 0, detalles: [] };
  }

  let ingresos = 0;
  let costos = 0;
  let gastos = 0;

  data.forEach((m: any) => {
    const cod = m.contabilidad_cuentas?.codigo || '';
    const neto = Number(m.haber) - Number(m.debe); 
    
    if (cod.startsWith('4')) {
      ingresos += neto;
    } else if (cod.startsWith('5')) {
      costos -= neto; 
    } else if (cod.startsWith('6')) {
      gastos -= neto;
    }
  });

  return {
    ingresos,
    costos,
    gastos,
    utilidad: ingresos - costos - gastos,
    detalles: data
  };
}

export async function getCuentasContables(empresaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contabilidad_cuentas')
    .select('id, codigo, nombre, tipo')
    .eq('empresa_id', empresaId)
    .order('codigo', { ascending: true });
  if (error) return [];
  return data;
}
