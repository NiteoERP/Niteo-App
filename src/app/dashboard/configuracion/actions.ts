'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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
  
  const { error } = await supabase
    .from('empresas')
    .update({ 
      nombre_comercial: data.nombre_comercial,
      moneda: data.moneda,
      simbolo_moneda: data.simbolo_moneda,
      zona_horaria: data.zona_horaria,
      metodo_costeo_despachos: data.metodo_costeo_despachos,
      metodos_pago: metodos,
      metodo_costeo_inventario: data.metodo_costeo_inventario,
      costeo_promedio_n: data.costeo_promedio_n
    })
    .eq('id', empresaId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Purge layout and configuracion cache to reload context
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/configuracion');
  
  return { success: true };
}
