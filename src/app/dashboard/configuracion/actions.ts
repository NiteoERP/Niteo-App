'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9\s-]/g, '')   // quitar caracteres especiales
    .trim()
    .replace(/\s+/g, '-')            // espacios → guiones
    .replace(/-+/g, '-');            // guiones dobles → uno
}

export async function getEmpresaData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, empresa: null, error: 'No autenticado' };

  let empresaId = user.app_metadata?.empresa_id;
  if (!empresaId) {
    const { data: dbProfile } = await supabase
      .from('perfiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();
    empresaId = dbProfile?.empresa_id;
  }

  if (!empresaId) return { user, empresa: null, error: 'Empresa no encontrada' };

  const { data: empresa, error } = await supabase
    .from('empresas')
    .select('*, slug_catalogo, whatsapp_catalogo, catalogo_activo')
    .eq('id', empresaId)
    .single();

  return { user, empresa, error: error?.message || null };
}

export async function updateEmpresaSaaS(empresaId: string, data: any) {
  const supabase = await createClient();

  const updatePayload: any = {};

  if (data.nombre_comercial !== undefined) updatePayload.nombre_comercial = data.nombre_comercial;
  if (data.rubro !== undefined) updatePayload.rubro = data.rubro;
  if (data.moneda !== undefined) updatePayload.moneda = data.moneda;
  if (data.simbolo_moneda !== undefined) updatePayload.simbolo_moneda = data.simbolo_moneda;
  if (data.zona_horaria !== undefined) updatePayload.zona_horaria = data.zona_horaria;
  if (data.metodo_costeo_despachos !== undefined) updatePayload.metodo_costeo_despachos = data.metodo_costeo_despachos;
  if (data.metodo_costeo_inventario !== undefined) updatePayload.metodo_costeo_inventario = data.metodo_costeo_inventario;
  if (data.costeo_promedio_n !== undefined) updatePayload.costeo_promedio_n = data.costeo_promedio_n;

  if (typeof data.catalogo_activo !== 'undefined') {
    updatePayload.catalogo_activo = data.catalogo_activo;
  }
  if (typeof data.whatsapp_catalogo !== 'undefined') {
    updatePayload.whatsapp_catalogo = data.whatsapp_catalogo || null;
  }

  // Si se envían métodos de pago, asegurar que 'Cortesía' siempre esté presente y normalizado
  if (data.metodos_pago !== undefined) {
    let metodos: string[] = Array.isArray(data.metodos_pago) ? [...data.metodos_pago] : [];
    if (!metodos.some(m => m.toLowerCase().includes('cortes'))) {
      metodos.push('Cortesía');
    }
    // Deduplicar letra por letra (case-insensitive)
    const seen = new Set<string>();
    metodos = metodos.filter(m => {
      const norm = m.trim().toLowerCase();
      if (!norm || seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
    updatePayload.metodos_pago = metodos;
  }

  // Generar slug si la empresa aún no tiene uno
  if (data.nombre_comercial) {
    const { data: empresaActual } = await supabase
      .from('empresas')
      .select('slug_catalogo')
      .eq('id', empresaId)
      .single();

    if (!empresaActual?.slug_catalogo) {
      const baseSlug = generarSlug(data.nombre_comercial);
      const { data: existing } = await supabase
        .from('empresas')
        .select('id')
        .eq('slug_catalogo', baseSlug)
        .neq('id', empresaId)
        .maybeSingle();

      updatePayload.slug_catalogo = existing
        ? `${baseSlug}-${empresaId.slice(0, 6)}`
        : baseSlug;
    }
  }

  const { error } = await supabase
    .from('empresas')
    .update(updatePayload)
    .eq('id', empresaId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Sincronizar rubro en perfiles para todos los usuarios de la empresa
  if (data.rubro) {
    await supabase
      .from('perfiles')
      .update({ rubro: data.rubro })
      .eq('empresa_id', empresaId);
  }

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/configuracion');
  revalidatePath('/dashboard/configuracion/pagos');
  revalidatePath('/dashboard/configuracion/inventario');
  revalidatePath('/dashboard/configuracion/catalogo');
  revalidatePath('/dashboard/catalogo');

  return { success: true };
}

export async function updateCatalogoConfig(empresaId: string, config: {
  catalogo_activo?: boolean;
  whatsapp_catalogo?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { error } = await supabase
    .from('empresas')
    .update(config)
    .eq('id', empresaId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/catalogo');
  revalidatePath('/dashboard/configuracion');
  return { success: true };
}
