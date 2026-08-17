'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registrarCompra(formData: FormData) {
  // 1. Instanciar Supabase Server Client
  const supabase = await createClient();

  // 2. Extraer datos del formulario
  const insumo_id = formData.get('insumo_id') as string;
  const cantidadStr = formData.get('cantidad') as string;
  const costoTotalStr = formData.get('costo_total') as string;

  if (!insumo_id || !cantidadStr || !costoTotalStr) {
    return { error: 'Por favor, completa todos los campos requeridos.' };
  }

  const cantidad = parseFloat(cantidadStr);
  const costo_total = parseFloat(costoTotalStr);

  if (isNaN(cantidad) || cantidad <= 0) {
    return { error: 'La cantidad debe ser un número mayor a 0.' };
  }

  if (isNaN(costo_total) || costo_total < 0) {
    return { error: 'El costo total debe ser un número válido.' };
  }

  // 3. Obtener el usuario actual
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Debes iniciar sesión para registrar compras.' };
  }

  // 4. Ejecutar RPC para la transacción atómica
  const { error: rpcError } = await supabase.rpc('registrar_compra_insumo', {
    p_insumo_id: insumo_id,
    p_usuario_id: user.id,
    p_cantidad: cantidad,
    p_costo_total: costo_total
  });

  if (rpcError) {
    console.error('Error al registrar compra:', rpcError);
    return { error: 'Ocurrió un error al registrar la compra. Intenta de nuevo.' };
  }

  // 5. Revalidar la vista para refrescar inventario y compras
  revalidatePath('/dashboard/compras');
  
  return { success: true };
}

export async function getInsumos() {
  const supabase = await createClient();
  
  // Extraemos los insumos filtrados por la política RLS (sede del usuario)
  const { data, error } = await supabase
    .from('inventario_insumos')
    .select('id, nombre, unidad_medida')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error cargando insumos:', error);
    return [];
  }

  return data;
}
