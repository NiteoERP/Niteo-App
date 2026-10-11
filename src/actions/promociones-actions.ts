'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface PromocionGrupoConfig {
  titulo: string;
  cantidad: number;
  filtro_tipo: 'CATEGORIA' | 'PRODUCTOS';
  categoria_id?: string;
  categoria_nombre?: string;
  productos_permitidos?: string[]; // IDs de productos específicos
  permitir_repetidos?: boolean;
}

export interface PromocionConfigSeleccion {
  cantidad_total: number;
  cobrar_cantidad?: number;
  grupos: PromocionGrupoConfig[];
}

export interface PromocionCombo {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion?: string | null;
  tipo: 'NX_M' | 'COMBO_GRUPOS';
  regla_precio: 'COBRAR_MAYOR' | 'COBRAR_MENOR' | 'PRECIO_FIJO' | 'DESCUENTO_PCT';
  precio_fijo?: number | null;
  descuento_porcentaje?: number | null;
  config_seleccion: PromocionConfigSeleccion;
  dias_activos?: string[] | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  estado_activo: boolean;
  producto_id?: string | null;
  creado_en?: string;
}

/**
 * Obtiene todas las promociones configuradas de la empresa
 */
export async function getPromociones(empresaIdParam?: string): Promise<PromocionCombo[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let empresaId = empresaIdParam;
  if (!empresaId) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();
    empresaId = perfil?.empresa_id;
  }

  if (!empresaId) return [];

  const { data, error } = await supabase
    .from('promociones_combos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('[getPromociones] Error fetching promos:', error);
    return [];
  }

  return (data || []) as PromocionCombo[];
}

/**
 * Obtiene las promociones actualmente activas y disponibles para facturación
 */
export async function getPromocionesActivas(empresaIdParam?: string): Promise<PromocionCombo[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let empresaId = empresaIdParam;
  if (!empresaId) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();
    empresaId = perfil?.empresa_id;
  }

  if (!empresaId) return [];

  const { data, error } = await supabase
    .from('promociones_combos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('estado_activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('[getPromocionesActivas] Error:', error);
    return [];
  }

  return (data || []) as PromocionCombo[];
}

/**
 * Crea o actualiza una promoción
 */
export async function guardarPromocion(input: {
  id?: string;
  nombre: string;
  descripcion?: string;
  tipo: 'NX_M' | 'COMBO_GRUPOS';
  regla_precio: 'COBRAR_MAYOR' | 'COBRAR_MENOR' | 'PRECIO_FIJO' | 'DESCUENTO_PCT';
  precio_fijo?: number;
  descuento_porcentaje?: number;
  config_seleccion: PromocionConfigSeleccion;
  dias_activos?: string[];
  hora_inicio?: string | null;
  hora_fin?: string | null;
  estado_activo?: boolean;
}): Promise<{ success: boolean; promo?: PromocionCombo; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil?.empresa_id) return { success: false, error: 'Perfil o empresa no encontrados' };
  const empresaId = perfil.empresa_id;

  try {
    let productoId: string | null = null;

    // Si ya existe la promo, verificar si tiene producto vinculado
    if (input.id) {
      const { data: promoActual } = await supabase
        .from('promociones_combos')
        .select('producto_id')
        .eq('id', input.id)
        .single();
      productoId = promoActual?.producto_id || null;
    }

    // Aseguramos que exista un registro en 'productos' para que esta promo sea un ítem oficial
    if (productoId) {
      // Actualizar nombre del producto oficial
      await supabase
        .from('productos')
        .update({
          nombre: input.nombre,
          descripcion: input.descripcion || null,
          precio_venta: input.precio_fijo || 0,
        })
        .eq('id', productoId);
    } else {
      // Crear producto oficial para la promoción
      const { data: nuevoProd, error: errProd } = await supabase
        .from('productos')
        .insert({
          empresa_id: empresaId,
          nombre: input.nombre,
          descripcion: input.descripcion || 'Promoción / Combo Especial',
          precio_venta: input.precio_fijo || 0,
          costo: 0,
          es_compuesto: false,
          es_servicio: false,
          canal_venta: 'AMBOS',
          estado_activo: true,
        })
        .select('id')
        .single();

      if (!errProd && nuevoProd) {
        productoId = nuevoProd.id;
      }
    }

    const payload = {
      empresa_id: empresaId,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() || null,
      tipo: input.tipo,
      regla_precio: input.regla_precio,
      precio_fijo: input.regla_precio === 'PRECIO_FIJO' ? (input.precio_fijo || 0) : null,
      descuento_porcentaje: input.regla_precio === 'DESCUENTO_PCT' ? (input.descuento_porcentaje || 0) : null,
      config_seleccion: input.config_seleccion,
      dias_activos: input.dias_activos || ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      hora_inicio: input.hora_inicio || null,
      hora_fin: input.hora_fin || null,
      estado_activo: input.estado_activo ?? true,
      producto_id: productoId,
    };

    if (input.id) {
      const { data, error } = await supabase
        .from('promociones_combos')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();

      if (error) throw error;
      revalidatePath('/dashboard/promociones');
      revalidatePath('/dashboard/terminal');
      return { success: true, promo: data as PromocionCombo };
    } else {
      const { data, error } = await supabase
        .from('promociones_combos')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      revalidatePath('/dashboard/promociones');
      revalidatePath('/dashboard/terminal');
      return { success: true, promo: data as PromocionCombo };
    }
  } catch (err: any) {
    console.error('[guardarPromocion] Error:', err);
    return { success: false, error: err.message || 'Error al guardar la promoción' };
  }
}

/**
 * Activa o desactiva una promoción
 */
export async function togglePromocionEstado(id: string, nuevoEstado: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('promociones_combos')
    .update({ estado_activo: nuevoEstado })
    .eq('id', id);

  if (error) {
    console.error('[togglePromocionEstado] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/promociones');
  revalidatePath('/dashboard/terminal');
  return { success: true };
}

/**
 * Elimina una promoción
 */
export async function eliminarPromocion(id: string) {
  const supabase = await createClient();
  
  // Buscar si tiene producto_id para desactivarlo
  const { data: promo } = await supabase
    .from('promociones_combos')
    .select('producto_id')
    .eq('id', id)
    .single();

  if (promo?.producto_id) {
    await supabase
      .from('productos')
      .update({ estado_activo: false })
      .eq('id', promo.producto_id);
  }

  const { error } = await supabase
    .from('promociones_combos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[eliminarPromocion] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/promociones');
  revalidatePath('/dashboard/terminal');
  return { success: true };
}
