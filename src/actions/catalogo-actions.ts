'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createProducto(data: any) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  // 1. Insertar el producto en la tabla productos
  const { data: nuevoProd, error: prodErr } = await supabase
    .from('productos')
    .insert({
      empresa_id: perfil.empresa_id,
      nombre: data.nombre,
      codigo_barras: data.codigo_barras || '',
      precio_venta: parseFloat(data.precio_venta) || 0,
      costo: parseFloat(data.costo) || 0,
      precio_modificable: !!data.precio_modificable,
      estado_activo: true,
      canal_venta: 'AMBOS',
      es_compuesto: data.tipo === 'ELABORADO', // Si es elaborado requiere receta
    })
    .select()
    .single();

  if (prodErr) {
    console.error('Error creando producto:', prodErr);
    return { success: false, error: 'Error al crear producto: ' + prodErr.message };
  }

  // 2. Si el producto es de tipo "REVENTA" (Insumo Directo), creamos su espejo en el inventario
  if (data.tipo === 'REVENTA') {
    // Buscamos la sede principal (o podríamos forzarlo a global, pero inventario_insumos pide sede_id)
    const { data: sede } = await supabase.from('sedes').select('id').eq('empresa_id', perfil.empresa_id).limit(1).single();
    
    const sedeId = data.sede_id || sede?.id;

    if (sedeId) {
      // Creamos el Insumo
      const { data: nuevoInsumo, error: insumoErr } = await supabase
        .from('inventario_insumos')
        .insert({
          empresa_id: perfil.empresa_id,
          sede_id: sedeId,
          nombre: data.nombre + ' (Reventa)',
          unidad_medida: data.unidad_medida || 'unidades',
          costo_promedio: parseFloat(data.costo) || 0,
          cantidad_actual: 0
        })
        .select()
        .single();

      if (!insumoErr && nuevoInsumo) {
        // Enlazamos 1 a 1 en recetas
        await supabase
          .from('recetas')
          .insert({
            empresa_id: perfil.empresa_id,
            producto_id: nuevoProd.id,
            insumo_id: nuevoInsumo.id,
            cantidad_necesaria: 1,
          });
      }
    }
  }

  revalidatePath('/dashboard/catalogo');
  revalidatePath('/dashboard/inventario');
  return { success: true };
}

export async function deleteProducto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/catalogo');
  return { success: true };
}

export async function updateProducto(id: string, data: any) {
  const supabase = await createClient();
  const { error } = await supabase.from('productos').update({
      nombre: data.nombre,
      codigo_barras: data.codigo_barras || '',
      precio_venta: parseFloat(data.precio_venta) || 0,
      costo: parseFloat(data.costo) || 0,
      precio_modificable: !!data.precio_modificable,
      es_compuesto: data.tipo === 'ELABORADO',
  }).eq('id', id);
  
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/catalogo');
  return { success: true };
}
