'use server';
import { getResumenPagos } from './cierres-actions';


import { createClient } from '@/utils/supabase/server';
import { startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { formatFecha } from '@/utils/date-utils';

// ─── Helpers de carga de datos para filtros dinámicos ───────────────────────

export async function getCategorias() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const empresaId = user.app_metadata?.empresa_id;
  if (!empresaId) return [];

  const { data } = await supabase
    .rpc('get_categorias_productos', { p_empresa_id: empresaId });
  return (data || []).map((r: any) => r.categoria as string);
}

export async function getCajeros() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const empresaId = user.app_metadata?.empresa_id;
  if (!empresaId) return [];

  const { data } = await supabase
    .rpc('get_cajeros_empresa', { p_empresa_id: empresaId });
  return (data || []) as { id: string; nombre: string }[];
}

export async function getClientes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const empresaId = user.app_metadata?.empresa_id;
  if (!empresaId) return [];

  const { data } = await supabase
    .from('clientes')
    .select('id, nombre')
    .eq('empresa_id', empresaId)
    .order('nombre');
  return (data || []) as { id: string; nombre: string }[];
}

// ─── Generador de reportes ───────────────────────────────────────────────────

export interface ExtraFilters {
  categoriaFilter?: string;   // nombre de categoría ('Sin Categoría' o el nombre real)
  cajeroId?:        string;   // UUID del cajero/usuario
  clienteId?:       string;   // UUID del cliente
}

export async function generateReport(
  reportId:  string,
  sedeId:    string | null,
  startDate: string | Date,
    endDate:   string | Date,
  extra:     ExtraFilters = {}
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const p_empresa_id  = profile.empresa_id;
  const p_sede_id     = sedeId === 'ALL' ? null : sedeId;
  const p_fecha_inicio = typeof startDate === "string" ? startDate : startOfDay(new Date(startDate)).toISOString();
  const p_fecha_fin    = typeof endDate === "string" ? endDate : endOfDay(new Date(endDate)).toISOString();
  const p_categoria    = extra.categoriaFilter || null;
  const p_cajero_id    = extra.cajeroId  || null;
  const p_cliente_id   = extra.clienteId || null;

  if (reportId === 'compras_proveedores' || reportId === 'compras_metodos_pago') {
    return await handleComprasReports(supabase, reportId, p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin);
  }

  let rpcName  = '';
  let rpcParams: Record<string, any> = {};

    // JS-based reports (no RPC needed)
    if (['compras_insumos', 'compras_operador', 'gastos_operativos'].includes(reportId)) {
      const query = supabase
        .from('compras_puntuales')
        .select(`
          id, proveedor, fecha_registro, monto_divisas, monto_bs, tasa_cambio, detalles, metodo_pago, usuario_id
        `)
        .eq('id_empresa', p_empresa_id)
        .gte('fecha_registro', p_fecha_inicio)
        .lte('fecha_registro', p_fecha_fin)
        .order('fecha_registro', { ascending: false });

      if (p_sede_id) query.eq('id_sede', p_sede_id);
      
      const { data, error } = await query;
      if (error) return { success: false, error: error.message };

      const userIds = [...new Set(data.map((d: any) => d.usuario_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('perfiles').select('id, nombre_completo').in('id', userIds);
        if (profiles) {
          profiles.forEach((p: any) => { profilesMap[p.id] = p.nombre_completo; });
        }
      }

      const joinedData = data.map((d: any) => ({ ...d, nombre_operador: profilesMap[d.usuario_id] || 'Desconocido' }));

      if (reportId === 'compras_insumos') {
        let sumDivisas = 0;
        let sumBs = 0;
        const result = joinedData
          .filter((d: any) => {
            const det = d.detalles;
            if (typeof det === 'string' && det.includes('"is_insumos":true')) return true;
            if (typeof det === 'object' && det?.is_insumos) return true;
            return false;
          })
          .map((d: any) => {
            let obs = d.detalles;
            if (typeof obs === 'string' && obs.includes('{')) {
              try { obs = JSON.parse(obs).texto; } catch(e){}
            } else if (typeof obs === 'object') {
              obs = obs.texto || '';
            }
            sumDivisas += Number(d.monto_divisas || 0);
            sumBs += Number(d.monto_bs || 0);
            return {
              'FECHA': formatFecha(d.fecha_registro),
              'PROVEEDOR / GASTO': d.proveedor || 'Sin Nombre',
              'DOLARES': `$ ${d.monto_divisas?.toFixed(2)}`,
              'TASA': d.tasa_cambio,
              'Bs.': `Bs.S ${d.monto_bs?.toFixed(2)}`,
              'OBSERVACION': obs,
              'OPERADOR': d.nombre_operador
            };
          });

        if (result.length > 0) {
          result.push({
            'FECHA': 'TOTAL',
            'PROVEEDOR / GASTO': '',
            'DOLARES': `$ ${sumDivisas.toFixed(2)}`,
            'TASA': '',
            'Bs.': `Bs.S ${sumBs.toFixed(2)}`,
            'OBSERVACION': '',
            'OPERADOR': ''
          });
        }
        return { success: true, data: result };
      }

      if (reportId === 'gastos_operativos') {
        let sumDivisas = 0;
        let sumBs = 0;
        const result = joinedData
          .filter((d: any) => {
            const det = d.detalles;
            if (typeof det === 'string' && det.includes('"is_insumos":true')) return false;
            if (typeof det === 'object' && det?.is_insumos) return false;
            return true;
          })
          .map((d: any) => {
            sumDivisas += Number(d.monto_divisas || 0);
            sumBs += Number(d.monto_bs || 0);
            return {
              'FECHA': formatFecha(d.fecha_registro),
              'PROVEEDOR / GASTO': d.proveedor || 'Sin Nombre',
              'DOLARES': `$ ${d.monto_divisas?.toFixed(2)}`,
              'TASA': d.tasa_cambio,
              'Bs.': `Bs.S ${d.monto_bs?.toFixed(2)}`,
              'OBSERVACION': typeof d.detalles === 'string' ? d.detalles : d.detalles?.texto || '',
              'OPERADOR': d.nombre_operador
            };
          });

        if (result.length > 0) {
          result.push({
            'FECHA': 'TOTAL',
            'PROVEEDOR / GASTO': '',
            'DOLARES': `$ ${sumDivisas.toFixed(2)}`,
            'TASA': '',
            'Bs.': `Bs.S ${sumBs.toFixed(2)}`,
            'OBSERVACION': '',
            'OPERADOR': ''
          });
        }
        return { success: true, data: result };
      }

      if (reportId === 'compras_operador') {
        const summary: Record<string, { operador: string; cantidad: number; total_divisas: number; total_bs: number }> = {};
        for (const row of joinedData) {
          const op = row.nombre_operador || 'Desconocido';
          if (!summary[op]) summary[op] = { operador: op, cantidad: 0, total_divisas: 0, total_bs: 0 };
          summary[op].cantidad += 1;
          summary[op].total_divisas += Number(row.monto_divisas || 0);
          summary[op].total_bs += Number(row.monto_bs || 0);
        }
        
        const result = Object.values(summary).sort((a,b) => b.total_divisas - a.total_divisas).map(s => ({
          'OPERADOR': s.operador,
          'COMPRAS REALIZADAS': s.cantidad,
          'TOTAL DOLARES': `$ ${s.total_divisas.toFixed(2)}`,
          'TOTAL Bs.': `Bs.S ${s.total_bs.toFixed(2)}`
        }));
        return { success: true, data: result };
      }
    }

  switch (reportId) {

    // ── Informes existentes ────────────────────────────────────────────────

    case 'ventas_diarias':
      rpcName   = 'get_reporte_ventas_diarias';
      rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;

    case 'ventas_productos':
      rpcName   = 'get_reporte_ventas_productos';
      rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;

    case 'ventas_clientes':
      rpcName   = 'get_reporte_ventas_clientes';
      rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin, p_cajero_nombre: p_cajero_id };
      break;

    case 'ventas_productos_clientes':
      rpcName   = 'get_reporte_ventas_productos_clientes';
      rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;

    case 'ventas_usuarios':
      rpcName   = 'get_reporte_ventas_usuarios';
      rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;

    case 'cuentas_por_cobrar':
      rpcName   = 'get_reporte_cuentas_por_cobrar';
      rpcParams = { p_empresa_id, p_sede_id };
      break;

    case 'cuentas_abiertas':
      rpcName   = 'get_reporte_cuentas_abiertas';
      rpcParams = { p_empresa_id, p_sede_id };
      break;

    case 'ventas_metodos_pago':
      // Usar la lógica de Resumen de Pagos en JS (pivoteado por día) para evitar errores del RPC
      const resumenReq = await getResumenPagos(
        p_fecha_inicio.split('T')[0],
        p_fecha_fin.split('T')[0],
        p_sede_id || 'ALL'
      );
      if (resumenReq.error || !resumenReq.data) {
        return { success: false, error: resumenReq.error || 'Error cargando ingresos por método' };
      }
      
      // Formatear los datos para la tabla de informes
      const formattedData = resumenReq.data.map(row => {
        const obj: any = { Fecha: row.fecha, 'Total (USD)': row.total_usd };
        Object.entries(row.metodos).forEach(([m, v]) => {
          obj[m] = v;
        });
        return obj;
      });
      return { success: true, data: formattedData.length > 0 ? formattedData : [] };

    case 'cierres_caja':
      rpcName   = 'get_reporte_cierres_caja';
      rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;

    // ── Mermas y Regalías (Cortesías bonificadas + pérdidas) ────────────────
    case 'mermas':
      return await handleMermasYRegaliasReport(supabase, p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin);

    // ── NUEVOS Informes de Ventas ──────────────────────────────────────────

    /**
     * Detalle completo de ventas:
     * número de orden · fecha/hora · cliente · cajero · productos · métodos de pago
     * Filtros opcionales: cliente, cajero
     */
    case 'detalle_ventas':
      rpcName   = 'get_reporte_detalle_ventas';
      rpcParams = {
        p_empresa_id,
        p_sede_id,
        p_fecha_inicio,
        p_fecha_fin,
        p_cliente_id,
        p_cajero_nombre: p_cajero_id, // El backend fue actualizado para recibir el nombre
      };
      break;

    /**
     * Ventas agrupadas por categoría de producto.
     * Filtros opcionales: categoría, cajero, cliente
     */
    case 'ventas_categoria':
      rpcName   = 'get_reporte_ventas_categoria';
      rpcParams = {
        p_empresa_id,
        p_sede_id,
        p_fecha_inicio,
        p_fecha_fin,
        p_categoria,
        p_cajero_nombre: p_cajero_id,
        p_cliente_id,
      };
      break;

    /**
     * Productos vendidos con filtros detallados:
     * código · nombre · categoría · unidades · ingresos · precio promedio
     * Filtros opcionales: categoría, cajero, cliente
     */
    case 'productos_vendidos':
      rpcName   = 'get_reporte_productos_vendidos';
      rpcParams = {
        p_empresa_id,
        p_sede_id,
        p_fecha_inicio,
        p_fecha_fin,
        p_categoria,
        p_cajero_nombre: p_cajero_id,
        p_cliente_id,
      };
      break;

    default:
      return { success: false, error: 'Reporte no implementado todavía.' };
  }

  const { data, error } = await supabase.rpc(rpcName, rpcParams);

  if (error) {
    console.error('Error generando reporte:', error);
    return { success: false, error: error.message };
  }

  // En detalle_ventas: eliminar cortesías/regalías del informe de ventas percibidas
  if (reportId === 'detalle_ventas' && Array.isArray(data)) {
    const sinCortesias = data.filter((r: any) => {
      const mp = String(r.metodos_pago || '').toLowerCase();
      const numDoc = String(r.numero_documento || '').toLowerCase();
      const numOrd = String(r.numero_orden || '').toLowerCase();
      return !mp.includes('cortes') && !mp.includes('regal') && !numDoc.includes('cortes') && !numOrd.includes('cortes');
    });
    return { success: true, data: sinCortesias };
  }

  return { success: true, data };
}

async function handleComprasReports(supabase: any, reportId: string, empresaId: string, sedeId: string | null, start: string, end: string) {
  if (reportId === 'compras_proveedores') {
    const query = supabase
      .from('compras_puntuales')
      .select('id, proveedor, fecha_registro, monto_divisas, monto_bs, tasa_cambio, detalles, metodo_pago')
      .eq('id_empresa', empresaId)
      .gte('fecha_registro', start)
      .lte('fecha_registro', end)
      .order('fecha_registro', { ascending: false });

    if (sedeId) query.eq('id_sede', sedeId);
    
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const mappedData = data.map((d: any) => ({
      fecha_registro: d.fecha_registro,
      proveedor: d.proveedor || 'Sin Nombre',
      monto_divisas: d.monto_divisas,
      monto_bs: d.monto_bs,
      tasa_cambio: d.tasa_cambio,
      metodo_pago: d.metodo_pago,
      detalles: typeof d.detalles === 'string' && d.detalles.includes('{') 
        ? JSON.parse(d.detalles).texto 
        : d.detalles
    }));

    return { success: true, data: mappedData };
  }
  
  if (reportId === 'compras_metodos_pago') {
    const query = supabase
      .from('compras_puntuales')
      .select('metodo_pago, monto_divisas, monto_bs')
      .eq('id_empresa', empresaId)
      .gte('fecha_registro', start)
      .lte('fecha_registro', end);
      
    if (sedeId) query.eq('id_sede', sedeId);
    
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const summary: Record<string, { metodo: string; total_divisas: number; total_bs: number; cantidad: number }> = {};
    
    for (const row of data) {
      const m = row.metodo_pago || 'Desconocido';
      if (!summary[m]) summary[m] = { metodo: m, total_divisas: 0, total_bs: 0, cantidad: 0 };
      summary[m].total_divisas += Number(row.monto_divisas || 0);
      summary[m].total_bs += Number(row.monto_bs || 0);
      summary[m].cantidad += 1;
    }

    return { success: true, data: Object.values(summary).sort((a,b) => b.total_divisas - a.total_divisas) };
  }
  
  return { success: false, error: 'Unknown report' };
}

async function handleMermasYRegaliasReport(
  supabase: any,
  empresaId: string,
  sedeId: string | null,
  start: string,
  end: string
) {
  try {
    // 1. Obtener pagos de cortesía con su factura, cliente, detalles y productos
    let pagosQuery = supabase
      .from('ventas_pagos')
      .select(`
        id,
        tipo_pago,
        monto,
        ventas_facturas!inner (
          id,
          fecha_venta,
          numero_documento,
          numero_orden,
          cliente_nombre,
          tipo_documento,
          total,
          empresa_id,
          sede_id,
          clientes (
            id,
            nombre
          ),
          ventas_detalles (
            cantidad,
            precio_unitario,
            total,
            productos (
              id,
              nombre,
              costo,
              precio_venta
            )
          )
        )
      `)
      .ilike('tipo_pago', '%cortes%')
      .eq('ventas_facturas.empresa_id', empresaId)
      .gte('ventas_facturas.fecha_venta', start)
      .lte('ventas_facturas.fecha_venta', end)
      .order('ventas_facturas(fecha_venta)', { ascending: false });

    if (sedeId) {
      pagosQuery = pagosQuery.eq('ventas_facturas.sede_id', sedeId);
    }

    const { data: pagosData, error: pagosErr } = await pagosQuery;
    if (pagosErr) {
      console.error('Error fetching cortesias:', pagosErr);
      return { success: false, error: pagosErr.message };
    }

    // 2. Consultar mermas manuales registradas en la tabla shrinkages si existen
    let shrinkagesQuery = supabase
      .from('shrinkages')
      .select(`
        id,
        quantity,
        unit_cost,
        total_loss,
        notes,
        created_at,
        shrinkage_reasons (name),
        productos (nombre, precio_venta)
      `)
      .gte('created_at', start)
      .lte('created_at', end);

    const { data: shrinkData } = await shrinkagesQuery;

    const rows: Record<string, any>[] = [];
    let sumCantidad = 0;
    let sumCostoTotal = 0;
    let sumVentaTotal = 0;

    // Procesar Cortesías
    for (const p of pagosData || []) {
      const f = p.ventas_facturas;
      if (!f) continue;

      const fechaStr = formatFecha(f.fecha_venta);
      const destinatario = 
        f.cliente_nombre || 
        (f.clientes?.nombre && f.clientes?.nombre !== 'Unknown' ? f.clientes.nombre : '') || 
        f.numero_orden || 
        'Consumidor Final';

      const refDoc = f.numero_documento || f.numero_orden || 'Cortesía';
      const detalles = f.ventas_detalles || [];

      if (detalles.length === 0) {
        const monto = Number(p.monto || f.total || 0);
        sumCantidad += 1;
        sumVentaTotal += monto;
        rows.push({
          'Fecha': fechaStr,
          'Tipo': 'Cortesía',
          'Lo Que Se Regaló': 'Consumo / Cortesía General',
          'Cantidad': 1,
          'A Quién Se Regaló': destinatario,
          'Precio Coste Unitario ($)': '$ 0.00',
          'Total Coste ($)': '$ 0.00',
          'Precio Venta Unitario ($)': `$ ${monto.toFixed(2)}`,
          'Total Venta Regalada ($)': `$ ${monto.toFixed(2)}`,
          'Nº Ref': refDoc
        });
      } else {
        for (const d of detalles) {
          const prodName = d.productos?.nombre || 'Producto sin nombre';
          const cant = Number(d.cantidad || 1);
          const costoUnit = Number(d.productos?.costo || 0);
          const subtotalCosto = costoUnit * cant;
          const pvUnit = Number(d.precio_unitario || d.productos?.precio_venta || 0);
          const subtotalVenta = pvUnit * cant;

          sumCantidad += cant;
          sumCostoTotal += subtotalCosto;
          sumVentaTotal += subtotalVenta;

          rows.push({
            'Fecha': fechaStr,
            'Tipo': 'Cortesía',
            'Lo Que Se Regaló': prodName,
            'Cantidad': cant,
            'A Quién Se Regaló': destinatario,
            'Precio Coste Unitario ($)': `$ ${costoUnit.toFixed(2)}`,
            'Total Coste ($)': `$ ${subtotalCosto.toFixed(2)}`,
            'Precio Venta Unitario ($)': `$ ${pvUnit.toFixed(2)}`,
            'Total Venta Regalada ($)': `$ ${subtotalVenta.toFixed(2)}`,
            'Nº Ref': refDoc
          });
        }
      }
    }

    // Procesar Mermas si existen
    for (const s of (shrinkData as any[]) || []) {
      const fechaStr = formatFecha(s.created_at);
      const cant = Number(s.quantity || 1);
      const costoUnit = Number(s.unit_cost || 0);
      const subtotalCosto = Number(s.total_loss || (cant * costoUnit));
      const pvUnit = Number(s.productos?.precio_venta || 0);
      const subtotalVenta = cant * pvUnit;

      sumCantidad += cant;
      sumCostoTotal += subtotalCosto;
      sumVentaTotal += subtotalVenta;

      rows.push({
        'Fecha': fechaStr,
        'Tipo': s.shrinkage_reasons?.name || 'Merma',
        'Lo Que Se Regaló': s.productos?.nombre || 'Insumo / Producto',
        'Cantidad': cant,
        'A Quién Se Regaló': s.notes || 'Ajuste de inventario',
        'Precio Coste Unitario ($)': `$ ${costoUnit.toFixed(2)}`,
        'Total Coste ($)': `$ ${subtotalCosto.toFixed(2)}`,
        'Precio Venta Unitario ($)': `$ ${pvUnit.toFixed(2)}`,
        'Total Venta Regalada ($)': `$ ${subtotalVenta.toFixed(2)}`,
        'Nº Ref': 'Ajuste Merma'
      });
    }

    // Fila de TOTALES al final
    if (rows.length > 0) {
      rows.push({
        'Fecha': 'TOTAL',
        'Tipo': '',
        'Lo Que Se Regaló': `${rows.length} registros bonificados`,
        'Cantidad': sumCantidad,
        'A Quién Se Regaló': '',
        'Precio Coste Unitario ($)': '',
        'Total Coste ($)': `$ ${sumCostoTotal.toFixed(2)}`,
        'Precio Venta Unitario ($)': '',
        'Total Venta Regalada ($)': `$ ${sumVentaTotal.toFixed(2)}`,
        'Nº Ref': ''
      });
    }

    return { success: true, data: rows };
  } catch (err: any) {
    console.error('Error generating mermas report:', err);
    return { success: false, error: err.message || 'Error generando reporte de mermas' };
  }
}

