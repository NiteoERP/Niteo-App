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
      let allCompras: any[] = [];
      let fromCompras = 0;
      const batchSizeCompras = 1000;

      while (true) {
        let query = supabase
          .from('compras_puntuales')
          .select(`
            id, proveedor, fecha_registro, monto_divisas, monto_bs, tasa_cambio, detalles, metodo_pago, usuario_id, estado
          `)
          .eq('id_empresa', p_empresa_id)
          .gte('fecha_registro', p_fecha_inicio)
          .lte('fecha_registro', p_fecha_fin)
          .neq('estado', 'ANULADA')
          .order('fecha_registro', { ascending: false })
          .range(fromCompras, fromCompras + batchSizeCompras - 1);

        if (p_sede_id) query = query.eq('id_sede', p_sede_id);
        
        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        if (!data || data.length === 0) break;
        allCompras = allCompras.concat(data);
        if (data.length < batchSizeCompras) break;
        fromCompras += batchSizeCompras;
      }

      const userIds = [...new Set(allCompras.map((d: any) => d.usuario_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('perfiles').select('id, nombre_completo').in('id', userIds);
        if (profiles) {
          profiles.forEach((p: any) => { profilesMap[p.id] = p.nombre_completo; });
        }
      }

      const joinedData = allCompras.map((d: any) => ({ ...d, nombre_operador: profilesMap[d.usuario_id] || 'Desconocido' }));

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

    case 'cuentas_por_cobrar': {
      let allFacturas: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        let query = supabase
          .from('ventas_facturas')
          .select(`
            id,
            numero_documento,
            fecha_venta,
            fecha_vencimiento,
            total,
            saldo_pendiente,
            estado_pago,
            cajero_nombre,
            cliente_nombre,
            cliente_id,
            clientes (
              id,
              nombre,
              rif_cedula,
              telefono
            ),
            sedes (
              id,
              nombre_sede
            ),
            ventas_pagos (
              id_pos,
              tipo_pago,
              monto,
              fecha_pago
            )
          `)
          .eq('empresa_id', p_empresa_id)
          .gte('fecha_venta', p_fecha_inicio)
          .lte('fecha_venta', p_fecha_fin)
          .eq('estado_activo', true)
          .order('fecha_venta', { ascending: true })
          .range(from, from + batchSize - 1);

        if (p_sede_id) {
          query = query.eq('sede_id', p_sede_id);
        }
        if (p_cliente_id) {
          query = query.eq('cliente_id', p_cliente_id);
        }

        const { data, error: qErr } = await query;
        if (qErr) {
          return { success: false, error: qErr.message };
        }
        if (!data || data.length === 0) break;

        allFacturas = allFacturas.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      }

      const rows: Record<string, any>[] = [];
      let sumTotalVenta = 0;
      let sumCredito = 0;
      let sumPagado = 0;
      let sumSaldo = 0;

      for (const f of allFacturas) {
        const pagos = f.ventas_pagos || [];
        const pagosCred = pagos.filter((p: any) => p.tipo_pago?.toLowerCase().includes('cred'));
        const tienePagoCredito = pagosCred.length > 0;
        const saldo = Number(f.saldo_pendiente || 0);
        const tieneSaldo = saldo > 0 || f.estado_pago === 2;
        const hasAbono = pagos.some((p: any) => p.id_pos?.startsWith('GLB_') || p.id_pos?.startsWith('WEB_GLB_'));

        if (!tienePagoCredito && !tieneSaldo && !hasAbono) {
          continue;
        }

        let montoCredito = 0;
        if (tienePagoCredito) {
          montoCredito = pagosCred.reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0);
        } else {
          const pagosNoAbono = pagos.filter((p: any) => !p.id_pos?.startsWith('GLB_') && !p.id_pos?.startsWith('WEB_GLB_'));
          const pagadoInicial = pagosNoAbono.reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0);
          montoCredito = Math.max(Number(f.total || 0) - pagadoInicial, saldo);
        }

        if (montoCredito <= 0 && saldo > 0) {
          montoCredito = saldo;
        }

        const montoPagado = Math.max(0, montoCredito - saldo);
        let estado = 'PAGADO';
        if (saldo > 0.001) {
          estado = montoPagado > 0.001 ? 'PARCIAL' : 'PENDIENTE';
        }

        const clienteNom = (f.clientes?.nombre || f.cliente_nombre || 'Cliente Eventual').trim();
        const rif = f.clientes?.rif_cedula || '-';
        const sedeNom = f.sedes?.nombre_sede || '-';
        const fDate = new Date(f.fecha_venta);
        const fechaStr = !isNaN(fDate.getTime()) ? format(fDate, 'dd/MM/yyyy') : '-';
        const vDate = f.fecha_vencimiento ? new Date(f.fecha_vencimiento) : fDate;
        const vencStr = !isNaN(vDate.getTime()) ? format(vDate, 'dd/MM/yyyy') : fechaStr;

        const totVenta = Number(Number(f.total || 0).toFixed(2));
        const mCred = Number(montoCredito.toFixed(2));
        const mPag = Number(montoPagado.toFixed(2));
        const mSaldo = Number(saldo.toFixed(2));

        sumTotalVenta += totVenta;
        sumCredito += mCred;
        sumPagado += mPag;
        sumSaldo += mSaldo;

        rows.push({
          'Número de documento': f.numero_documento || '-',
          'Fecha': fechaStr,
          'Vencimiento': vencStr,
          'Total': totVenta,
          'Total pagado': mPag,
          'Total impago': mSaldo,
          'Cliente': clienteNom,
          'Cédula / RIF': rif,
          'Estado': estado,
          'Sucursal': sedeNom,
          numero_documento: f.numero_documento || '-',
          fecha: fechaStr,
          vencimiento: vencStr,
          total: totVenta,
          total_pagado: mPag,
          total_impago: mSaldo,
          cliente: clienteNom,
          rif: rif,
          estado: estado,
          sucursal: sedeNom,
        });
      }

      if (rows.length > 0) {
        rows.push({
          'Número de documento': `${rows.length} créditos`,
          'Fecha': 'TOTALES',
          'Vencimiento': '',
          'Total': Number(sumTotalVenta.toFixed(2)),
          'Total pagado': Number(sumPagado.toFixed(2)),
          'Total impago': Number(sumSaldo.toFixed(2)),
          'Cliente': '',
          'Cédula / RIF': '',
          'Estado': '',
          'Sucursal': '',
          numero_documento: `${rows.length} créditos`,
          fecha: 'TOTALES',
          vencimiento: '',
          total: Number(sumTotalVenta.toFixed(2)),
          total_pagado: Number(sumPagado.toFixed(2)),
          total_impago: Number(sumSaldo.toFixed(2)),
          cliente: '',
          rif: '',
          estado: '',
          sucursal: '',
        });
      }

      return { success: true, data: rows };
    }

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
      return await handleDetalleVentasReport(
        supabase,
        p_empresa_id,
        p_sede_id,
        p_fecha_inicio,
        p_fecha_fin,
        p_categoria,
        p_cajero_id,
        p_cliente_id
      );

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

  // En productos_vendidos: agregar descripciones de combos y desglose de sub-productos para promociones
  if (reportId === 'productos_vendidos' && Array.isArray(data)) {
    try {
      const { data: prodsDesc } = await supabase
        .from('productos')
        .select('nombre, descripcion')
        .eq('empresa_id', p_empresa_id);

      const descMap = new Map<string, string>();
      (prodsDesc || []).forEach((p: any) => {
        if (p.nombre && p.descripcion) {
          descMap.set(p.nombre.trim().toUpperCase(), p.descripcion.trim());
        }
      });

      let mappedData = data.map((row: any) => {
        const pName = String(row.producto || '').trim().toUpperCase();
        return {
          ...row,
          descripcion: descMap.get(pName) || ''
        };
      });

      let queryCombos = supabase
        .from('ventas_detalles')
        .select(`
          producto_id,
          cantidad,
          combo_items,
          productos!inner (
            id,
            nombre
          ),
          ventas_facturas!inner (
            empresa_id,
            sede_id,
            fecha_venta,
            estado_activo
          )
        `)
        .eq('ventas_facturas.empresa_id', p_empresa_id)
        .eq('ventas_facturas.estado_activo', true)
        .not('combo_items', 'is', null);

      if (p_sede_id) {
        queryCombos = queryCombos.eq('ventas_facturas.sede_id', p_sede_id);
      }
      if (p_fecha_inicio) {
        queryCombos = queryCombos.gte('ventas_facturas.fecha_venta', p_fecha_inicio);
      }
      if (p_fecha_fin) {
        queryCombos = queryCombos.lte('ventas_facturas.fecha_venta', p_fecha_fin);
      }

      const { data: comboSales } = await queryCombos;

      if (comboSales && comboSales.length > 0) {
        const promoSubItemsMap: Record<string, Record<string, number>> = {};
        for (const sale of comboSales) {
          const promoNombre = (sale.productos as any)?.nombre;
          if (!promoNombre) continue;
          if (!promoSubItemsMap[promoNombre]) {
            promoSubItemsMap[promoNombre] = {};
          }
          const items = Array.isArray(sale.combo_items) ? sale.combo_items : [];
          const promoQty = Number(sale.cantidad || 1);
          for (const sub of items) {
            const subName = sub.nombre || 'Sub-producto';
            const subQty = Number(sub.cantidad || 1) * promoQty;
            promoSubItemsMap[promoNombre][subName] = (promoSubItemsMap[promoNombre][subName] || 0) + subQty;
          }
        }

        mappedData = mappedData.map((row: any) => {
          if (row.producto && promoSubItemsMap[row.producto]) {
            const desglose = Object.entries(promoSubItemsMap[row.producto]).map(([nombre, cantidad]) => ({
              nombre,
              cantidad,
            }));
            desglose.sort((a, b) => b.cantidad - a.cantidad);
            return {
              ...row,
              combo_desglose: desglose,
            };
          }
          return row;
        });
      }
      return { success: true, data: mappedData };
    } catch (errCombo) {
      console.warn('Advertencia en informes-actions obteniendo descripciones o desglose de promociones:', errCombo);
    }
  }

  return { success: true, data };
}

async function handleDetalleVentasReport(
  supabase: any,
  empresaId: string,
  sedeId: string | null,
  fechaInicio: string,
  fechaFin: string,
  categoria: string | null,
  cajeroNombre: string | null,
  clienteId: string | null
) {
  let allFacturas: any[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    let query = supabase
      .from('ventas_facturas')
      .select(`
        id,
        numero_orden,
        numero_documento,
        fecha_venta,
        cliente_nombre,
        cajero_nombre,
        mesero_nombre,
        total,
        descuento,
        estado_pago,
        tipo_documento,
        clientes (
          id,
          nombre
        ),
        ventas_detalles (
          cantidad,
          precio_unitario,
          total,
          descuento,
          combo_items,
          productos (
            id,
            nombre,
            categoria_id,
            categorias (
              id,
              nombre
            )
          )
        ),
        ventas_pagos (
          tipo_pago,
          monto
        )
      `)
      .eq('empresa_id', empresaId)
      .gte('fecha_venta', fechaInicio)
      .lte('fecha_venta', fechaFin)
      .eq('estado_activo', true)
      .order('fecha_venta', { ascending: false })
      .range(from, from + batchSize - 1);

    if (sedeId) query = query.eq('sede_id', sedeId);
    if (clienteId) query = query.eq('cliente_id', clienteId);
    if (cajeroNombre) query = query.ilike('cajero_nombre', `%${cajeroNombre}%`);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) break;
    allFacturas = allFacturas.concat(data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  const isCortesia = (f: any) => {
    const docType = (f.tipo_documento || '').toLowerCase();
    const docOrd = (f.numero_orden || '').toLowerCase();
    const docNum = (f.numero_documento || '').toLowerCase();
    const pagos = f.ventas_pagos || [];
    const hasCortesiaPago = pagos.some((p: any) => {
      const tp = (p.tipo_pago || '').toLowerCase();
      return tp.includes('cortes') || tp.includes('regal');
    });
    return hasCortesiaPago || docType.includes('cortes') || docOrd.includes('cortes') || docNum.includes('cortes');
  };

  const rows: Record<string, any>[] = [];
  let sumSub = 0;
  let sumDesc = 0;
  let sumTot = 0;

  for (const f of allFacturas) {
    if (isCortesia(f)) continue;

    const allDetalles = f.ventas_detalles || [];
    let relevantDetalles = allDetalles;

    if (categoria) {
      relevantDetalles = allDetalles.filter((d: any) => {
        const catName = d.productos?.categorias?.nombre || '';
        return catName.toLowerCase() === categoria.toLowerCase();
      });
      if (relevantDetalles.length === 0) {
        continue;
      }
    }

    const facturaTotal = Number(f.total || 0);
    const facturaDescuento = Number(f.descuento || 0);
    const facturaSubtotalOriginal = facturaTotal + facturaDescuento;

    let rowSubtotal = 0;
    let rowDescuento = 0;
    const prodList: string[] = [];

    if (categoria) {
      for (const d of relevantDetalles) {
        const cant = Number(d.cantidad || 1);
        const tot = Number(d.total || (Number(d.precio_unitario || 0) * cant));
        rowSubtotal += tot;
        rowDescuento += Number(d.descuento || 0);
        const pName = d.productos?.nombre || 'Producto';
        prodList.push(`${pName} x${cant}`);
      }
      if (facturaDescuento > 0 && rowDescuento === 0 && facturaSubtotalOriginal > 0) {
        rowDescuento = Number(((rowSubtotal / facturaSubtotalOriginal) * facturaDescuento).toFixed(2));
      }
    } else {
      for (const d of relevantDetalles) {
        const cant = Number(d.cantidad || 1);
        const pName = d.productos?.nombre || 'Producto';
        prodList.push(`${pName} x${cant}`);
      }
      rowDescuento = facturaDescuento;
      rowSubtotal = facturaSubtotalOriginal;
    }

    const docType = (f.tipo_documento || '').toLowerCase();
    const isRefund = docType.includes('devoluc') || docType.includes('refund') || docType.includes('nota_credito') || docType.includes('nc') || Number(f.total || 0) < 0;

    let rowTotal = Number(Math.max(0, rowSubtotal - rowDescuento).toFixed(2));
    if (isRefund) {
      rowSubtotal = -Math.abs(rowSubtotal);
      rowTotal = -Math.abs(rowTotal);
    }
    rowSubtotal = Number(rowSubtotal.toFixed(2));
    rowDescuento = Number(rowDescuento.toFixed(2));

    sumSub += rowSubtotal;
    sumDesc += rowDescuento;
    sumTot += rowTotal;

    const cliente = f.clientes?.nombre || f.cliente_nombre || 'Consumidor Final';
    const fDate = new Date(f.fecha_venta);
    const fechaHora = !isNaN(fDate.getTime()) ? format(fDate, 'dd/MM/yyyy hh:mm a') : '-';
    const pagos = f.ventas_pagos || [];
    const metodos = Array.from(new Set(pagos.map((p: any) => p.tipo_pago).filter(Boolean))).join(', ') || 'Efectivo';
    const estado = isRefund ? 'Devolución' : (f.estado_pago === 1 ? 'Pagado' : (f.estado_pago === 2 ? 'Crédito' : (f.estado_pago === 0 ? 'Pendiente' : 'Pagado')));

    rows.push({
      numero_orden: f.numero_orden || '—',
      numero_documento: f.numero_documento || '—',
      fecha_hora: fechaHora,
      cliente,
      cajero: f.cajero_nombre || '—',
      mesero: f.mesero_nombre || '—',
      productos: prodList.join(', '),
      subtotal: rowSubtotal,
      descuento: rowDescuento,
      total: rowTotal,
      metodos_pago: metodos,
      estado,
    });
  }

  if (rows.length > 0) {
    rows.push({
      numero_orden: 'TOTALES',
      numero_documento: '',
      fecha_hora: '',
      cliente: '',
      cajero: '',
      mesero: '',
      productos: `${rows.length} registros${categoria ? ` (Cat: ${categoria})` : ''}`,
      subtotal: Number(sumSub.toFixed(2)),
      descuento: Number(sumDesc.toFixed(2)),
      total: Number(sumTot.toFixed(2)),
      metodos_pago: '',
      estado: '',
    });
  }

  return { success: true, data: rows };
}

async function handleComprasReports(supabase: any, reportId: string, empresaId: string, sedeId: string | null, start: string, end: string) {
  if (reportId === 'compras_proveedores') {
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      let query = supabase
        .from('compras_puntuales')
        .select('proveedor, monto_divisas, monto_bs, estado')
        .eq('id_empresa', empresaId)
        .gte('fecha_registro', start)
        .lte('fecha_registro', end)
        .neq('estado', 'ANULADA')
        .order('fecha_registro', { ascending: false })
        .range(from, from + batchSize - 1);

      if (sedeId) query = query.eq('id_sede', sedeId);
      
      const { data, error } = await query;
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    const summary: Record<string, { proveedor: string; total_divisas: number; total_bs: number; cantidad: number }> = {};
    for (const d of allData) {
      const p = (d.proveedor || 'Sin Nombre').trim();
      if (!summary[p]) summary[p] = { proveedor: p, total_divisas: 0, total_bs: 0, cantidad: 0 };
      summary[p].total_divisas += Number(d.monto_divisas || 0);
      summary[p].total_bs += Number(d.monto_bs || 0);
      summary[p].cantidad += 1;
    }

    const arr = Object.values(summary).sort((a, b) => b.total_divisas - a.total_divisas);

    let sumDivisas = 0;
    let sumBs = 0;
    let sumCant = 0;

    const mappedData = arr.map(d => {
      sumDivisas += d.total_divisas;
      sumBs += d.total_bs;
      sumCant += d.cantidad;
      return {
        'PROVEEDOR / TIENDA': d.proveedor,
        'VECES COMPRADO': d.cantidad,
        'TOTAL DOLARES': `$ ${d.total_divisas.toFixed(2)}`,
        'TOTAL Bs.': `Bs.S ${d.total_bs.toFixed(2)}`
      };
    });

    if (mappedData.length > 0) {
      mappedData.push({
        'PROVEEDOR / TIENDA': 'TOTAL GENERAL',
        'VECES COMPRADO': sumCant,
        'TOTAL DOLARES': `$ ${sumDivisas.toFixed(2)}`,
        'TOTAL Bs.': `Bs.S ${sumBs.toFixed(2)}`
      });
    }

    return { success: true, data: mappedData };
  }
  
  if (reportId === 'compras_metodos_pago') {
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      let query = supabase
        .from('compras_puntuales')
        .select('metodo_pago, monto_divisas, monto_bs, estado')
        .eq('id_empresa', empresaId)
        .gte('fecha_registro', start)
        .lte('fecha_registro', end)
        .neq('estado', 'ANULADA')
        .order('fecha_registro', { ascending: false })
        .range(from, from + batchSize - 1);
        
      if (sedeId) query = query.eq('id_sede', sedeId);
      
      const { data, error } = await query;
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    const summary: Record<string, { metodo: string; total_divisas: number; total_bs: number; cantidad: number }> = {};
    
    for (const row of allData) {
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
    let allPagosData: any[] = [];
    let fromPagos = 0;
    const batchSizePagos = 1000;

    while (true) {
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
        .eq('ventas_facturas.estado_activo', true)
        .eq('ventas_facturas.empresa_id', empresaId)
        .gte('ventas_facturas.fecha_venta', start)
        .lte('ventas_facturas.fecha_venta', end)
        .order('ventas_facturas(fecha_venta)', { ascending: false })
        .range(fromPagos, fromPagos + batchSizePagos - 1);

      if (sedeId) {
        pagosQuery = pagosQuery.eq('ventas_facturas.sede_id', sedeId);
      }

      const { data: bData, error: pagosErr } = await pagosQuery;
      if (pagosErr) {
        console.error('Error fetching cortesias:', pagosErr);
        return { success: false, error: pagosErr.message };
      }
      if (!bData || bData.length === 0) break;
      allPagosData = allPagosData.concat(bData);
      if (bData.length < batchSizePagos) break;
      fromPagos += batchSizePagos;
    }

    // 2. Consultar mermas manuales registradas en la tabla shrinkages si existen
    let allShrinkData: any[] = [];
    let fromShrink = 0;
    const batchSizeShrink = 1000;

    while (true) {
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
          productos (nombre, precio_venta),
          inventario_insumos (nombre)
        `)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })
        .range(fromShrink, fromShrink + batchSizeShrink - 1);

      if (empresaId) {
        shrinkagesQuery = shrinkagesQuery.eq('empresa_id', empresaId);
      }
      if (sedeId) {
        shrinkagesQuery = shrinkagesQuery.eq('sede_id', sedeId);
      }

      const { data: sData } = await shrinkagesQuery;
      if (!sData || sData.length === 0) break;
      allShrinkData = allShrinkData.concat(sData);
      if (sData.length < batchSizeShrink) break;
      fromShrink += batchSizeShrink;
    }

    const rows: Record<string, any>[] = [];
    let sumCantidad = 0;
    let sumCostoTotal = 0;
    let sumVentaTotal = 0;

    // Procesar Cortesías
    for (const p of allPagosData) {
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
    for (const s of allShrinkData) {
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
        'Lo Que Se Regaló': s.inventario_insumos?.nombre || s.productos?.nombre || 'Insumo / Producto',
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



