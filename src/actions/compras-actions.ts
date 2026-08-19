'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registrarCompra(formData: FormData) {
  // 1. Instanciar Supabase Server Client
  const supabase = await createClient();

  // 3. Obtener el usuario actual
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Debes iniciar sesión para registrar compras.' };
  }

  // Obtener perfil para sacar empresa_id y sede_id
  const { data: profile } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { error: 'No se pudo obtener el perfil del usuario.' };
  }

  // 2. Extraer datos del formulario
  let insumo_id = formData.get('insumo_id') as string;
  const nombre_nuevo_insumo = formData.get('nombre_nuevo_insumo') as string;
  const unidad_medida_nueva = formData.get('unidad_medida_nueva') as string;
  
  const cantidadStr = formData.get('cantidad') as string;
  const costoTotalStr = formData.get('costo_total') as string;

  if (!cantidadStr || !costoTotalStr) {
    return { error: 'Por favor, completa la cantidad y el costo total.' };
  }

  const cantidad = parseFloat(cantidadStr);
  const costo_total = parseFloat(costoTotalStr);

  if (isNaN(cantidad) || cantidad <= 0) {
    return { error: 'La cantidad debe ser un número mayor a 0.' };
  }
  if (isNaN(costo_total) || costo_total < 0) {
    return { error: 'El costo total debe ser un número válido.' };
  }

  // Si es un insumo nuevo, lo creamos primero
  if (nombre_nuevo_insumo) {
    if (!unidad_medida_nueva) return { error: 'Selecciona la unidad de medida para el nuevo insumo.' };
    
    // Insertar el nuevo insumo (la cantidad empieza en 0, el RPC luego le suma la cantidad de la compra)
    const { data: newInsumo, error: insertError } = await supabase
      .from('inventario_insumos')
      .insert({
        empresa_id: profile.empresa_id,
        sede_id: profile.sede_id,
        nombre: nombre_nuevo_insumo,
        unidad_medida: unidad_medida_nueva,
        cantidad_actual: 0,
        costo_promedio: 0
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error al crear insumo:', insertError);
      return { error: 'Error al crear el nuevo insumo en la base de datos.' };
    }
    
    insumo_id = newInsumo.id;
  }

  if (!insumo_id) {
    return { error: 'Debes seleccionar un insumo válido o crear uno nuevo.' };
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
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from('perfiles')
    .select('sede_id')
    .eq('id', user.id)
    .single();

  if (!profile?.sede_id) return [];

  // Filtramos estrictamente por sede_id (tienda) para que no se crucen insumos
  const { data, error } = await supabase
    .from('inventario_insumos')
    .select('id, nombre, unidad_medida')
    .eq('sede_id', profile.sede_id)
    .order('nombre', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error cargando insumos:', error);
    return [];
  }

  return data;
}

export async function getTasaDelDia(): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('tasas_cambio')
      .select('tasa')
      .gte('fecha', today)
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return 36.50; 
    }

    return Number(data.tasa);
  } catch (err) {
    return 36.50;
  }
}
