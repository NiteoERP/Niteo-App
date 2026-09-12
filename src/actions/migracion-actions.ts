'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function importarProductos(productosImport: any[]) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const nuevosProductos = productosImport.map((p: any) => {
    return {
      empresa_id: perfil.empresa_id,
      nombre: p.Nombre,
      codigo_barras: p['Cdigo de Barras']?.toString() || '',
      precio_venta: parseFloat(p['Precio de Venta']) || 0,
      costo: parseFloat(p['Costo']) || 0,
      precio_modificable: (p['Precio Modificable']?.toString().toUpperCase() === 'SI' || p['Precio Modificable'] === true),
      estado_activo: true,
      canal_venta: 'AMBOS',
      unidad_medida: p['Unidad de Medida'] || 'unidades'
    };
  });

  const { error } = await supabase
    .from('productos')
    .insert(nuevosProductos);

  if (error) {
    console.error('Error importando productos:', error);
    return { success: false, error: 'Hubo un error importando el catlogo.' };
  }

  revalidatePath('/dashboard/inventario');
  return { success: true, count: nuevosProductos.length };
}

export async function exportarCatalogo() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const { data: productos, error } = await supabase
    .from('productos')
    .select('nombre, codigo_barras, precio_venta, costo, precio_modificable, unidad_medida')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre');

  if (error) {
    return { success: false, error: 'Error obteniendo catlogo' };
  }

  return { success: true, data: productos };
}
