'use server';

import { createClient } from '@/utils/supabase/server';
import { startOfDay, endOfDay } from 'date-fns';

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

  let rpcName  = '';
  let rpcParams: Record<string, any> = {};

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
      rpcName   = 'get_reporte_metodos_pago';
      rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;

    case 'cierres_caja':
      rpcName   = 'get_reporte_cierres_caja';
      rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;

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

  return { success: true, data };
}
