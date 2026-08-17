'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registrarMerma(formData: FormData) {
  // 1. Instanciar Supabase Server Client
  const supabase = await createClient();

  // 2. Extraer datos del formulario
  const insumo_id = formData.get('insumo_id') as string;
  const cantidadStr = formData.get('cantidad') as string;
  const motivo = formData.get('motivo') as string;

  if (!insumo_id || !cantidadStr || !motivo) {
    return { error: 'Por favor, completa todos los campos requeridos.' };
  }

  const cantidad = parseFloat(cantidadStr);

  if (isNaN(cantidad) || cantidad <= 0) {
    return { error: 'La cantidad a mermar debe ser mayor a 0.' };
  }

  // 3. Obtener el usuario actual
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Debes iniciar sesión para registrar una merma.' };
  }

  // 4. Ejecutar RPC para la transacción atómica
  const { error: rpcError } = await supabase.rpc('registrar_merma_insumo', {
    p_insumo_id: insumo_id,
    p_usuario_id: user.id,
    p_cantidad: cantidad,
    p_motivo: motivo
  });

  if (rpcError) {
    console.error('Error al registrar merma:', rpcError);
    return { error: 'Ocurrió un error al procesar la merma en la base de datos.' };
  }

  // 5. Revalidar la vista para refrescar inventario y métricas
  revalidatePath('/dashboard/inventario');
  
  return { success: true };
}
