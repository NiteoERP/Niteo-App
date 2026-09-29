import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function duplicarCatalogoSede(origenSedeId: string, destinoSedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const empresaId = user.app_metadata?.empresa_id;
  if (!empresaId) return { error: 'Sin empresa_id' };

  // Obtener productos de la sede origen
  const { data: productosOrigen, error: errOrigen } = await supabase
    .from('productos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('sede_id', origenSedeId);

  if (errOrigen) return { error: errOrigen.message };
  if (!productosOrigen || productosOrigen.length === 0) {
    return { error: 'No hay productos en la sede de origen' };
  }

  // Preparar copias (sin id y con sede_id = destinoSedeId)
  const copias = productosOrigen.map(p => {
    const copia = { ...p };
    delete copia.id;
    delete copia.created_at;
    delete copia.updated_at;
    copia.sede_id = destinoSedeId;
    return copia;
  });

  const { error: errInsert } = await supabase
    .from('productos')
    .insert(copias);

  if (errInsert) return { error: errInsert.message };

  revalidatePath('/dashboard/catalogo');
  return { success: true, totalDuplicados: copias.length };
}
