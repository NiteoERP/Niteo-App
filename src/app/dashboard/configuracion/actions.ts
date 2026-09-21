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

export async function updateEmpresaSaaS(empresaId: string, data: any) {
  const supabase = await createClient();

  // Asegurar que 'Cortesía' siempre esté presente y normalizado
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

  const updatePayload: any = {
    nombre_comercial: data.nombre_comercial,
    moneda: data.moneda,
    simbolo_moneda: data.simbolo_moneda,
    zona_horaria: data.zona_horaria,
    metodo_costeo_despachos: data.metodo_costeo_despachos,
    metodos_pago: metodos,
    metodo_costeo_inventario: data.metodo_costeo_inventario,
    costeo_promedio_n: data.costeo_promedio_n,
  };

  // Campos del catálogo público (opcionales, solo si vienen en el payload)
  if (typeof data.catalogo_activo !== 'undefined') {
    updatePayload.catalogo_activo = data.catalogo_activo;
  }
  if (typeof data.whatsapp_catalogo !== 'undefined') {
    updatePayload.whatsapp_catalogo = data.whatsapp_catalogo || null;
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

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/configuracion');
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
