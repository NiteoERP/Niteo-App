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

    case 'compras_netas': {
      if (!p_sede_id) {
        return { success: false, error: 'El informe de Compras Netas requiere seleccionar una sede específica obligatoriamente.' };
      }
      const netasRes = await obtenerComprasNetasSede(p_sede_id, p_fecha_inicio, p_fecha_fin);
      if (!netasRes.success || !netasRes.data) {
        return { success: false, error: netasRes.error || 'Error calculando compras netas' };
      }
      const formattedRows = netasRes.data.movimientos.map(m => ({
        'FECHA': m.fecha_formateada,
        'TIPO': m.tipo_label,
        'IMPACTO': m.signo === '+' ? '+ SUMA' : '- RESTA',
        'DETALLE': m.descripcion,
        'ORIGEN / DESTINO': m.origen_destino,
        'REFERENCIA': m.referencia,
        'MONTO USD': `${m.signo} $ ${m.monto_usd.toFixed(2)}`,
        'MONTO Bs': m.monto_bs > 0 ? `${m.signo} Bs.S ${m.monto_bs.toFixed(2)}` : '-'
      }));

      if (formattedRows.length > 0) {
        formattedRows.push({
          'FECHA': 'TOTAL COMPRA NETA',
          'TIPO': 'TOTAL PERÍODO',
          'IMPACTO': '=',
          'DETALLE': `Locales ($${netasRes.data.compras_locales.total_usd.toFixed(2)}) + Recibidos ($${netasRes.data.despachos_recibidos.total_usd.toFixed(2)}) - Entregados ($${netasRes.data.despachos_entregados.total_usd.toFixed(2)})`,
          'ORIGEN / DESTINO': netasRes.data.sede.nombre,
          'REFERENCIA': 'ECUACIÓN CONTABLE',
          'MONTO USD': `$ ${netasRes.data.compra_neta_usd.toFixed(2)}`,
          'MONTO Bs': `Bs.S ${netasRes.data.compras_locales.total_bs.toFixed(2)}`
        });
      }

      return { success: true, data: formattedRows, metadata: netasRes.data };
    }

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

// ─── LÓGICA DE COMPRAS NETAS POR SEDE ────────────────────────────────────────

export interface MovimientoCompraNeta {
  id: string;
  fecha: string;
  fecha_formateada: string;
  tipo: 'COMPRA_LOCAL' | 'DESPACHO_RECIBIDO' | 'DESPACHO_ENTREGADO' | 'VENTA_AL_COSTO';
  tipo_label: string;
  signo: '+' | '-';
  descripcion: string;
  referencia: string;
  origen_destino: string;
  monto_usd: number;
  monto_bs: number;
  cantidad?: number;
}

export interface ComprasNetasResponse {
  success: boolean;
  error?: string;
  data?: {
    sede: { id: string; nombre: string };
    periodo: { inicio: string; fin: string };
    compras_locales: { total_usd: number; total_bs: number; cantidad: number };
    despachos_recibidos: { total_usd: number; cantidad: number };
    despachos_entregados: { total_usd: number; cantidad: number };
    ventas_costo: { total_usd: number; cantidad: number };
    compra_neta_usd: number;
    movimientos: MovimientoCompraNeta[];
  };
}

/**
 * Calcula la Compra Neta de una sede específica en un rango de fechas.
 * Ecuación contable:
 * Compras Netas = (Compras Locales Directas) + (Despachos Recibidos) - (Despachos Entregados)
 */
export async function obtenerComprasNetasSede(
  id_sede: string,
  fechaInicio: string,
  fechaFin: string
): Promise<ComprasNetasResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
      .from('perfiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Perfil no encontrado' };
    const empresaId = profile.empresa_id;

    if (!id_sede || id_sede === 'ALL') {
      return { success: false, error: 'Debe seleccionar una sede específica para el cálculo de compras netas.' };
    }

    // Normalizar fechas a ISO string completo
    const p_fecha_inicio = fechaInicio.includes('T') ? fechaInicio : `${fechaInicio}T00:00:00.000Z`;
    const p_fecha_fin = fechaFin.includes('T') ? fechaFin : `${fechaFin}T23:59:59.999Z`;

    // 1. Obtener nombre de la sede y 3 consultas paralelas (Promise.all)
    const [
      sedeRes,
      comprasLocalesPuntualesRes,
      comprasMercanciaRes,
      despachosRecibidosDetallesRes,
      despachosRecibidosItemsRes,
      despachosEntregadosDetallesRes,
      despachosEntregadosItemsRes,
      ventasCostoRes
    ] = await Promise.all([
      // Info de la sede
      supabase.from('sedes').select('id, nombre_sede').eq('id', id_sede).single(),

      // A) Compras Locales Directas (compras_puntuales)
      supabase
        .from('compras_puntuales')
        .select('id, proveedor, fecha_registro, monto_divisas, monto_bs, tasa_cambio, detalles, metodo_pago, estado')
        .eq('id_empresa', empresaId)
        .eq('id_sede', id_sede)
        .gte('fecha_registro', p_fecha_inicio)
        .lte('fecha_registro', p_fecha_fin)
        .neq('estado', 'ANULADA')
        .order('fecha_registro', { ascending: true }),

      // A.2) Compras mercancia (si aplica en el sistema)
      supabase
        .from('compras_mercancia')
        .select('id, id_proveedor, nro_factura, cantidad, precio_unitario, total, created_at')
        .eq('id_empresa', empresaId)
        .eq('id_sede', id_sede)
        .gte('created_at', p_fecha_inicio)
        .lte('created_at', p_fecha_fin),

      // B) Despachos Recibidos (despachos_detalles con JOIN despachos)
      supabase
        .from('despachos_detalles')
        .select(`
          id,
          monto_total,
          cantidad_enviada,
          cantidad_recibida,
          precio_unitario,
          nombre_item,
          despacho:despachos!inner (
            id,
            estado,
            sede_origen_id,
            sede_destino_id,
            fecha_envio,
            fecha_recepcion,
            origen:sedes!despachos_sede_origen_id_fkey (id, nombre_sede),
            destino:sedes!despachos_sede_destino_id_fkey (id, nombre_sede)
          )
        `)
        .eq('despacho.sede_destino_id', id_sede)
        .in('despacho.estado', ['RECIBIDO', 'COMPLETADO'])
        .gte('despacho.fecha_envio', p_fecha_inicio)
        .lte('despacho.fecha_envio', p_fecha_fin),

      // B.2) Despachos Recibidos (despachos_items fallback para insumos)
      supabase
        .from('despachos_items')
        .select(`
          id,
          nombre_insumo,
          cantidad,
          cantidad_recibida,
          costo_unitario,
          costo_transferencia,
          despacho:despachos!inner (
            id,
            estado,
            sede_origen_id,
            sede_destino_id,
            fecha_envio,
            fecha_recepcion,
            origen:sedes!despachos_sede_origen_id_fkey (id, nombre_sede),
            destino:sedes!despachos_sede_destino_id_fkey (id, nombre_sede)
          )
        `)
        .eq('despacho.sede_destino_id', id_sede)
        .in('despacho.estado', ['RECIBIDO', 'COMPLETADO'])
        .gte('despacho.fecha_envio', p_fecha_inicio)
        .lte('despacho.fecha_envio', p_fecha_fin),

      // C) Despachos Entregados (despachos_detalles con JOIN despachos)
      supabase
        .from('despachos_detalles')
        .select(`
          id,
          monto_total,
          cantidad_enviada,
          cantidad_recibida,
          precio_unitario,
          nombre_item,
          despacho:despachos!inner (
            id,
            estado,
            sede_origen_id,
            sede_destino_id,
            fecha_envio,
            fecha_recepcion,
            origen:sedes!despachos_sede_origen_id_fkey (id, nombre_sede),
            destino:sedes!despachos_sede_destino_id_fkey (id, nombre_sede)
          )
        `)
        .eq('despacho.sede_origen_id', id_sede)
        .neq('despacho.estado', 'CANCELADO')
        .gte('despacho.fecha_envio', p_fecha_inicio)
        .lte('despacho.fecha_envio', p_fecha_fin),

      // C.2) Despachos Entregados (despachos_items fallback para insumos)
      supabase
        .from('despachos_items')
        .select(`
          id,
          nombre_insumo,
          cantidad,
          cantidad_recibida,
          costo_unitario,
          costo_transferencia,
          despacho:despachos!inner (
            id,
            estado,
            sede_origen_id,
            sede_destino_id,
            fecha_envio,
            fecha_recepcion,
            origen:sedes!despachos_sede_origen_id_fkey (id, nombre_sede),
            destino:sedes!despachos_sede_destino_id_fkey (id, nombre_sede)
          )
        `)
        .eq('despacho.sede_origen_id', id_sede)
        .neq('despacho.estado', 'CANCELADO')
        .gte('despacho.fecha_envio', p_fecha_inicio)
        .lte('despacho.fecha_envio', p_fecha_fin),

      // D) Ventas al Costo (Traspaso Familiar / Consumo Interno)
      supabase
        .from('movimientos_inventario')
        .select(`
          id,
          cantidad,
          costo_perdido,
          fecha_movimiento,
          inventario_insumos!inner (
            id,
            nombre,
            unidad_medida,
            sede_id
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('motivo', 'VENTA_AL_COSTO')
        .eq('inventario_insumos.sede_id', id_sede)
        .gte('fecha_movimiento', p_fecha_inicio)
        .lte('fecha_movimiento', p_fecha_fin),
    ]);

    if (comprasLocalesPuntualesRes.error) {
      throw new Error(`Error en compras locales: ${comprasLocalesPuntualesRes.error.message}`);
    }
    if (despachosRecibidosDetallesRes.error) {
      throw new Error(`Error en despachos recibidos: ${despachosRecibidosDetallesRes.error.message}`);
    }
    if (despachosEntregadosDetallesRes.error) {
      throw new Error(`Error en despachos entregados: ${despachosEntregadosDetallesRes.error.message}`);
    }

    const sedeNombre = sedeRes.data?.nombre_sede || 'Sede Seleccionada';
    const movimientos: MovimientoCompraNeta[] = [];

    // ── PROCESAR A) COMPRAS LOCALES DIRECTAS (+) ─────────────────────────────
    let totalComprasLocalesUSD = 0;
    let totalComprasLocalesBs = 0;
    let cantComprasLocales = 0;

    for (const c of (comprasLocalesPuntualesRes.data || [])) {
      const montoUSD = Number(c.monto_divisas || 0);
      const montoBs = Number(c.monto_bs || 0);
      totalComprasLocalesUSD += montoUSD;
      totalComprasLocalesBs += montoBs;
      cantComprasLocales += 1;

      let obs = c.detalles;
      if (typeof obs === 'string' && obs.includes('{')) {
        try { obs = JSON.parse(obs).texto; } catch (_) {}
      } else if (typeof obs === 'object') {
        obs = obs?.texto || '';
      }

      movimientos.push({
        id: `compra-${c.id}`,
        fecha: c.fecha_registro,
        fecha_formateada: formatFecha(c.fecha_registro),
        tipo: 'COMPRA_LOCAL',
        tipo_label: 'Compra Local Directa',
        signo: '+',
        descripcion: `Compra a ${c.proveedor || 'Proveedor'}${obs ? ` (${obs})` : ''}`,
        referencia: `Comp #${c.id.slice(0, 8)}`,
        origen_destino: c.proveedor || 'Proveedor Directo',
        monto_usd: montoUSD,
        monto_bs: montoBs,
      });
    }

    for (const cm of (comprasMercanciaRes.data || [])) {
      const montoUSD = Number(cm.total || 0);
      totalComprasLocalesUSD += montoUSD;
      cantComprasLocales += 1;

      movimientos.push({
        id: `cm-${cm.id}`,
        fecha: cm.created_at,
        fecha_formateada: formatFecha(cm.created_at),
        tipo: 'COMPRA_LOCAL',
        tipo_label: 'Compra Mercancía',
        signo: '+',
        descripcion: `Factura Nº ${cm.nro_factura || 'S/N'}`,
        referencia: `Fact #${cm.nro_factura || cm.id.slice(0, 8)}`,
        origen_destino: 'Proveedor Mercancía',
        monto_usd: montoUSD,
        monto_bs: 0,
        cantidad: Number(cm.cantidad || 1),
      });
    }

    // ── PROCESAR B) DESPACHOS RECIBIDOS (+) ──────────────────────────────────
    let totalDespachosRecibidosUSD = 0;
    let cantDespachosRecibidos = 0;
    const despachosRecibidosIdsProcesados = new Set<string>();

    const getSedeName = (rel: any): string => {
      if (!rel) return 'Otra Sede';
      if (Array.isArray(rel)) return rel[0]?.nombre_sede || 'Otra Sede';
      return rel?.nombre_sede || 'Otra Sede';
    };

    // De despachos_detalles
    for (const dd of (despachosRecibidosDetallesRes.data || [])) {
      const d: any = Array.isArray(dd.despacho) ? dd.despacho[0] : dd.despacho;
      if (!d) continue;

      despachosRecibidosIdsProcesados.add(d.id);
      const montoUSD = Number(dd.monto_total || (Number(dd.cantidad_recibida || dd.cantidad_enviada || 0) * Number(dd.precio_unitario || 0)));
      totalDespachosRecibidosUSD += montoUSD;
      cantDespachosRecibidos += 1;

      const origenNombre = getSedeName(d.origen);
      const fechaMov = d.fecha_recepcion || d.fecha_envio;

      movimientos.push({
        id: `desp-rec-${dd.id}`,
        fecha: fechaMov,
        fecha_formateada: formatFecha(fechaMov),
        tipo: 'DESPACHO_RECIBIDO',
        tipo_label: 'Despacho Recibido',
        signo: '+',
        descripcion: `Recibido de ${origenNombre}: ${dd.nombre_item}`,
        referencia: `Desp #${d.id.slice(0, 8)}`,
        origen_destino: `Desde: ${origenNombre}`,
        monto_usd: montoUSD,
        monto_bs: 0,
        cantidad: Number(dd.cantidad_recibida ?? dd.cantidad_enviada ?? 0),
      });
    }

    // Fallback de despachos_items (para despachos que no estén en despachos_detalles)
    for (const di of (despachosRecibidosItemsRes.data || [])) {
      const d: any = Array.isArray(di.despacho) ? di.despacho[0] : di.despacho;
      if (!d || despachosRecibidosIdsProcesados.has(d.id)) continue;

      const cant = Number(di.cantidad_recibida ?? di.cantidad ?? 0);
      const costo = Number(di.costo_transferencia ?? di.costo_unitario ?? 0);
      const montoUSD = cant * costo;
      totalDespachosRecibidosUSD += montoUSD;
      cantDespachosRecibidos += 1;

      const origenNombre = getSedeName(d.origen);
      const fechaMov = d.fecha_recepcion || d.fecha_envio;

      movimientos.push({
        id: `desp-item-rec-${di.id}`,
        fecha: fechaMov,
        fecha_formateada: formatFecha(fechaMov),
        tipo: 'DESPACHO_RECIBIDO',
        tipo_label: 'Despacho Recibido (Insumos)',
        signo: '+',
        descripcion: `Recibido de ${origenNombre}: ${di.nombre_insumo}`,
        referencia: `Desp #${d.id.slice(0, 8)}`,
        origen_destino: `Desde: ${origenNombre}`,
        monto_usd: montoUSD,
        monto_bs: 0,
        cantidad: cant,
      });
    }

    // ── PROCESAR C) DESPACHOS ENTREGADOS / ENVIADOS (-) ──────────────────────
    let totalDespachosEntregadosUSD = 0;
    let cantDespachosEntregados = 0;
    const despachosEntregadosIdsProcesados = new Set<string>();

    // De despachos_detalles
    for (const dd of (despachosEntregadosDetallesRes.data || [])) {
      const d: any = Array.isArray(dd.despacho) ? dd.despacho[0] : dd.despacho;
      if (!d) continue;

      despachosEntregadosIdsProcesados.add(d.id);
      const montoUSD = Number(dd.monto_total || (Number(dd.cantidad_enviada || 0) * Number(dd.precio_unitario || 0)));
      totalDespachosEntregadosUSD += montoUSD;
      cantDespachosEntregados += 1;

      const destinoNombre = getSedeName(d.destino);
      const fechaMov = d.fecha_envio;

      movimientos.push({
        id: `desp-ent-${dd.id}`,
        fecha: fechaMov,
        fecha_formateada: formatFecha(fechaMov),
        tipo: 'DESPACHO_ENTREGADO',
        tipo_label: 'Despacho Entregado',
        signo: '-',
        descripcion: `Enviado a ${destinoNombre}: ${dd.nombre_item}`,
        referencia: `Desp #${d.id.slice(0, 8)}`,
        origen_destino: `Hacia: ${destinoNombre}`,
        monto_usd: montoUSD,
        monto_bs: 0,
        cantidad: Number(dd.cantidad_enviada ?? 0),
      });
    }

    // Fallback de despachos_items (para despachos que no estén en despachos_detalles)
    for (const di of (despachosEntregadosItemsRes.data || [])) {
      const d: any = Array.isArray(di.despacho) ? di.despacho[0] : di.despacho;
      if (!d || despachosEntregadosIdsProcesados.has(d.id)) continue;

      const cant = Number(di.cantidad ?? 0);
      const costo = Number(di.costo_transferencia ?? di.costo_unitario ?? 0);
      const montoUSD = cant * costo;
      totalDespachosEntregadosUSD += montoUSD;
      cantDespachosEntregados += 1;

      const destinoNombre = getSedeName(d.destino);
      const fechaMov = d.fecha_envio;

      movimientos.push({
        id: `desp-item-ent-${di.id}`,
        fecha: fechaMov,
        fecha_formateada: formatFecha(fechaMov),
        tipo: 'DESPACHO_ENTREGADO',
        tipo_label: 'Despacho Entregado (Insumos)',
        signo: '-',
        descripcion: `Enviado a ${destinoNombre}: ${di.nombre_insumo}`,
        referencia: `Desp #${d.id.slice(0, 8)}`,
        origen_destino: `Hacia: ${destinoNombre}`,
        monto_usd: montoUSD,
        monto_bs: 0,
        cantidad: cant,
      });
    }

    // D) Procesar Ventas al Costo (Traspaso Familiar / Consumo Interno)
    let totalVentasCostoUSD = 0;
    let cantVentasCosto = 0;

    for (const vc of (ventasCostoRes.data || [])) {
      const cant = Number(vc.cantidad ?? 0);
      const montoUSD = Number(vc.costo_perdido ?? 0);
      totalVentasCostoUSD += montoUSD;
      cantVentasCosto += 1;

      const insumoInfo: any = Array.isArray(vc.inventario_insumos)
        ? vc.inventario_insumos[0]
        : vc.inventario_insumos;
      const insumoNombre = insumoInfo?.nombre || 'Insumo';
      const unidad = insumoInfo?.unidad_medida || '';
      const fechaMov = vc.fecha_movimiento;

      movimientos.push({
        id: `venta-costo-${vc.id}`,
        fecha: fechaMov,
        fecha_formateada: formatFecha(fechaMov),
        tipo: 'VENTA_AL_COSTO',
        tipo_label: 'Venta al Costo',
        signo: '-',
        descripcion: `Retiro al costo: ${cant} ${unidad} de ${insumoNombre}`,
        referencia: `Traspaso #${vc.id.slice(0, 8)}`,
        origen_destino: `Consumo Interno / Familiar`,
        monto_usd: montoUSD,
        monto_bs: 0,
        cantidad: cant,
      });
    }

    // ── CALCULAR LA ECUACIÓN: COMPRA NETA = (A + B) - C - D ─────────────────
    const compraNetaUSD = (totalComprasLocalesUSD + totalDespachosRecibidosUSD) - totalDespachosEntregadosUSD - totalVentasCostoUSD;

    // Ordenar cronológicamente (más reciente primero o ascendente)
    movimientos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    return {
      success: true,
      data: {
        sede: { id: id_sede, nombre: sedeNombre },
        periodo: { inicio: p_fecha_inicio, fin: p_fecha_fin },
        compras_locales: {
          total_usd: totalComprasLocalesUSD,
          total_bs: totalComprasLocalesBs,
          cantidad: cantComprasLocales,
        },
        despachos_recibidos: {
          total_usd: totalDespachosRecibidosUSD,
          cantidad: cantDespachosRecibidos,
        },
        despachos_entregados: {
          total_usd: totalDespachosEntregadosUSD,
          cantidad: cantDespachosEntregados,
        },
        ventas_costo: {
          total_usd: totalVentasCostoUSD,
          cantidad: cantVentasCosto,
        },
        compra_neta_usd: compraNetaUSD,
        movimientos,
      },
    };
  } catch (err: any) {
    console.error('Error en obtenerComprasNetasSede:', err);
    return { success: false, error: err.message || 'Error inesperado al calcular compras netas.' };
  }
}


