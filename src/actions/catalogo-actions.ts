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
      categoria_id: data.categoria_id || null,
      nombre: data.nombre,
      codigo_barras: data.codigo_barras || '',
      precio_venta: parseFloat(data.precio_venta) || 0,
      costo: parseFloat(data.costo) || 0,
      precio_modificable: !!data.precio_modificable,
      estado_activo: true,
      canal_venta: 'AMBOS',
      es_compuesto: data.tipo === 'ELABORADO', // Si es elaborado requiere receta
      es_reventa: data.tipo === 'REVENTA',
      porcentaje_ganancia: parseFloat(data.porcentaje_ganancia) || 0
    })
    .select()
    .single();

  if (prodErr) {
    console.error('Error creando producto:', prodErr);
    return { success: false, error: 'Error al crear producto: ' + prodErr.message };
  }

  // 2. Manejo de RECETAS
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
          unidad_medida: 'Unidades',
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
  } else if (data.tipo === 'ELABORADO' && Array.isArray(data.receta_items)) {
    // Guardar los insumos de la receta que se armó en el modal
    const inserts = data.receta_items.map((item: any) => ({
      empresa_id: perfil.empresa_id,
      producto_id: nuevoProd.id,
      insumo_id: item.tipo === 'insumo' ? item.id : null,
      subproducto_id: item.tipo === 'producto' ? item.id : null,
      cantidad_necesaria: item.cantidad
    }));
    if (inserts.length > 0) {
      await supabase.from('recetas').insert(inserts);
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const { error } = await supabase.from('productos').update({
      categoria_id: data.categoria_id || null,
      nombre: data.nombre,
      codigo_barras: data.codigo_barras || '',
      precio_venta: parseFloat(data.precio_venta) || 0,
      costo: parseFloat(data.costo) || 0,
      precio_modificable: !!data.precio_modificable,
      es_compuesto: data.tipo === 'ELABORADO',
      es_reventa: data.tipo === 'REVENTA',
      porcentaje_ganancia: parseFloat(data.porcentaje_ganancia) || 0
  }).eq('id', id);
  
  if (error) return { success: false, error: error.message };

  if (data.tipo === 'ELABORADO' && Array.isArray(data.receta_items)) {
    // Para simplificar, borramos las recetas previas y reinsertamos
    await supabase.from('recetas').delete().eq('producto_id', id);
    const inserts = data.receta_items.map((item: any) => ({
      empresa_id: perfil.empresa_id,
      producto_id: id,
      insumo_id: item.tipo === 'insumo' ? item.id : null,
      subproducto_id: item.tipo === 'producto' ? item.id : null,
      cantidad_necesaria: item.cantidad
    }));
    if (inserts.length > 0) {
      await supabase.from('recetas').insert(inserts);
    }
  }

  revalidatePath('/dashboard/catalogo');
  return { success: true };
}

export async function bulkAssignReceta(data: {
  productIds: string[];
  recetaItems: any[];
  mode: 'append' | 'replace';
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  if (!data.productIds.length || !data.recetaItems.length) {
    return { success: false, error: 'Datos insuficientes.' };
  }

  // 1. Force the products to be 'ELABORADO' (es_compuesto = true) and remove es_reventa if true
  await supabase.from('productos')
    .update({ es_compuesto: true, es_reventa: false })
    .in('id', data.productIds);

  // 2. Manage recipes
  if (data.mode === 'replace') {
    // Delete all existing recipes for these products
    await supabase.from('recetas')
      .delete()
      .in('producto_id', data.productIds);
  }

  // Insert new recipes
  const inserts: any[] = [];
  for (const prodId of data.productIds) {
    for (const item of data.recetaItems) {
      inserts.push({
        empresa_id: perfil.empresa_id,
        producto_id: prodId,
        insumo_id: item.tipo === 'insumo' ? item.id : null,
        subproducto_id: item.tipo === 'producto' ? item.id : null,
        cantidad_necesaria: item.cantidad
      });
    }
  }

  // Supabase limits inserts, chunk if very large (though usually fine for < 1000 rows)
  if (inserts.length > 0) {
    const { error: insertErr } = await supabase.from('recetas').insert(inserts);
    if (insertErr) return { success: false, error: insertErr.message };
  }

  // 3. (Optional but recommended) Recalculate cost for these products?
  // We can skip this for now or trigger a background job. The user will see it update when they edit individually.
  // Or we do a simple update:
  // For each product, we could calculate the sum, but doing it in SQL is complex here.
  // Let's just revalidate path.

  revalidatePath('/dashboard/catalogo');
  return { success: true };
}

/**
 * Crea una nueva categoría para la empresa si no existe previamente.
 */
export async function createCategoria(nombre: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  if (!nombre || !nombre.trim()) {
    return { success: false, error: 'El nombre de la categoría es requerido.' };
  }

  const nombreLimpio = nombre.trim();
  const idPos = 'CAT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

  // Verificar si ya existe una categoría con ese nombre
  const { data: existing } = await supabase
    .from('categorias')
    .select('id, nombre, id_pos')
    .eq('empresa_id', perfil.empresa_id)
    .ilike('nombre', nombreLimpio)
    .maybeSingle();

  if (existing) {
    return { success: true, data: existing };
  }

  const { data, error } = await supabase
    .from('categorias')
    .insert({
      empresa_id: perfil.empresa_id,
      nombre: nombreLimpio,
      id_pos: idPos,
      estado_activo: true
    })
    .select('id, nombre, id_pos')
    .single();

  if (error) {
    console.error('Error al crear categoría:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/catalogo');
  return { success: true, data };
}

