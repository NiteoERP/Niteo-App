'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registrarGasto(formData: FormData) {
  const supabase = await createClient();

  const categoria = formData.get('categoria') as string;
  const descripcion = formData.get('descripcion') as string;
  const montoStr = formData.get('monto') as string;

  if (!categoria || !descripcion || !montoStr) {
    return { error: 'Por favor, completa todos los campos.' };
  }

  const monto = parseFloat(montoStr);
  if (isNaN(monto) || monto <= 0) {
    return { error: 'El monto debe ser un valor numérico mayor a 0.' };
  }

  // Obtener la sesión
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'No estás autenticado.' };
  }

  // Como la tabla gastos_sede usa RLS estricto, debemos enviar id_empresa e id_sede.
  // En Supabase, si la tabla usa Security Definer no pasa nada, pero aquí insertamos desde Next.
  // Por ende, debemos leer a qué sede pertenece este usuario para inyectarlo en el insert.
  const { data: profile, error: profileError } = await supabase
    .from('perfiles')
    .select('id_empresa, id_sede')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'No se encontró el perfil de tu empresa/sede.' };
  }

  // Insertar directamente en gastos_sede
  const { error: insertError } = await supabase
    .from('gastos_sede')
    .insert({
      id_empresa: profile.id_empresa,
      id_sede: profile.id_sede,
      id_usuario: user.id,
      categoria,
      descripcion,
      monto
    });

  if (insertError) {
    console.error('Error insertando gasto:', insertError);
    return { error: 'Ocurrió un error al guardar el gasto operativo.' };
  }

  // Revalidar para que se actualice el flujo de caja
  revalidatePath('/dashboard/gastos');
  
  return { success: true };
}

