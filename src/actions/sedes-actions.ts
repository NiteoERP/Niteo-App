'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Tipos
export interface Sede {
  id: string;
  empresa_id: string;
  nombre_sede: string;
  direccion?: string;
  estado_activo: boolean;
  master_key?: string;
  sistema_pos?: string;
  ultima_sincronizacion?: string;
  estado_sincronizacion: string;
  tipo_sede: 'FISICA' | 'VIRTUAL';
}

// Generador de Pairing Code seguro y fácil de tipear (ej: NITEO-A1B2-C3D4)
function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluidos I, O, 1, 0 para evitar confusión visual
  let code = 'NITEO-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += '-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

/**
 * Obtiene todas las sedes de la empresa del usuario logueado.
 */
export async function getSedes(): Promise<Sede[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return [];

  const { data: sedes, error } = await supabase
    .from('sedes')
    .select('*')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre_sede', { ascending: true });

  if (error) {
    console.error('Error fetching sedes:', error);
    return [];
  }

  return sedes as Sede[];
}

/**
 * Obtiene las sedes permitidas para los reportes de caja.
 * Si es MASTER, retorna todas. Si no, retorna solo la del usuario.
 */
export async function getSedesCaja(): Promise<Sede[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id, rol')
    .eq('id', user.id)
    .single();

  if (!perfil) return [];

  let query = supabase
    .from('sedes')
    .select('*')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre_sede', { ascending: true });

  if (perfil.rol !== 'MASTER') {
    query = query.eq('id', perfil.sede_id);
  }

  const { data: sedes, error } = await query;

  if (error) {
    console.error('Error fetching sedes caja:', error);
    return [];
  }

  return sedes as Sede[];
}

/**
 * Genera y guarda un nuevo master_key para una sede específica.
 */
export async function generarMasterKey(sedeId: string): Promise<{ success: boolean; key?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  // Verificamos que la sede pertenece a la empresa del usuario
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const newKey = generatePairingCode();

  const { error } = await supabase
    .from('sedes')
    .update({ master_key: newKey })
    .eq('id', sedeId)
    .eq('empresa_id', perfil.empresa_id); // Security hardening

  if (error) {
    console.error('Error updating master_key:', error);
    return { success: false, error: 'No se pudo generar la llave' };
  }

  revalidatePath('/dashboard/configuracion/sedes');
  return { success: true, key: newKey };
}

/**
 * Crea una nueva sede (FISICA o VIRTUAL)
 */
export async function crearSede(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { error: 'Perfil no encontrado' };

  const nombreSede = formData.get('nombre_sede') as string;
  const direccion = formData.get('direccion') as string;
  const tipoSede = (formData.get('tipo_sede') as string) || 'FISICA';

  if (!nombreSede) return { error: 'Nombre es requerido' };

  const { data: existingSede } = await supabase
    .from('sedes')
    .select('id')
    .eq('empresa_id', perfil.empresa_id)
    .ilike('nombre_sede', nombreSede)
    .maybeSingle();

  if (existingSede) {
    return { error: 'Ya existe una sede con ese nombre. Por favor elige otro.' };
  }

  const newMasterKey = generatePairingCode();

  const { error } = await supabase
    .from('sedes')
    .insert({
      empresa_id: perfil.empresa_id,
      nombre_sede: nombreSede,
      direccion: direccion || null,
      tipo_sede: tipoSede,
      master_key: newMasterKey,
    });

  if (error) {
    console.error('Error al crear sede:', error);
    return { error: 'Ocurrió un error al crear la sucursal.' };
  }

  revalidatePath('/dashboard/configuracion/sedes');
  return { success: true };
}

/**
 * Obtiene el ID de la sede virtual de la empresa.
 * Retorna null si no existe ninguna sede virtual creada.
 */
export async function getSedeVirtualId(): Promise<string | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return null;

  const { data: sede } = await supabase
    .from('sedes')
    .select('id')
    .eq('empresa_id', perfil.empresa_id)
    .eq('tipo_sede', 'VIRTUAL')
    .eq('estado_activo', true)
    .limit(1)
    .single();

  return sede?.id ?? null;
}

export interface HistorialSedeInfo {
  ventas: number;
  pedidos: number;
  cierres: number;
  compras: number;
  gastos: number;
  insumos: number;
  productos: number;
  usuarios: number;
  puedeEliminarFisicamente: boolean;
}

/**
 * Consulta el historial y dependencias reales de una sede.
 */
export async function getHistorialSede(sedeId: string): Promise<HistorialSedeInfo | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { error: 'Perfil no encontrado' };

  try {
    const [
      { count: ventasCount },
      { count: pedidosCount },
      { count: cierresCount },
      { count: comprasCount },
      { count: gastosCount },
      { count: insumosCount },
      { count: productosCount },
      { count: usuariosCount }
    ] = await Promise.all([
      supabase.from('ventas_facturas').select('*', { count: 'exact', head: true }).eq('sede_id', sedeId),
      supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('sede_id', sedeId),
      supabase.from('cierres_caja').select('*', { count: 'exact', head: true }).eq('sede_id', sedeId),
      supabase.from('compras_facturas').select('*', { count: 'exact', head: true }).eq('sede_id', sedeId),
      supabase.from('gastos_sede').select('*', { count: 'exact', head: true }).eq('sede_id', sedeId),
      supabase.from('inventario_insumos').select('*', { count: 'exact', head: true }).eq('sede_id', sedeId),
      supabase.from('productos').select('*', { count: 'exact', head: true }).eq('sede_id', sedeId),
      supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('sede_id', sedeId),
    ]);

    const ventas = ventasCount || 0;
    const pedidos = pedidosCount || 0;
    const cierres = cierresCount || 0;
    const compras = comprasCount || 0;
    const gastos = gastosCount || 0;
    const insumos = insumosCount || 0;
    const productos = productosCount || 0;
    const usuarios = usuariosCount || 0;

    // Actividad operativa crítica (ventas, pedidos, cierres, compras, gastos)
    const totalOperativo = ventas + pedidos + cierres + compras + gastos;
    const puedeEliminarFisicamente = totalOperativo === 0;

    return {
      ventas,
      pedidos,
      cierres,
      compras,
      gastos,
      insumos,
      productos,
      usuarios,
      puedeEliminarFisicamente,
    };
  } catch (err: any) {
    console.error('Error al obtener historial de sede:', err);
    return { error: 'No se pudo consultar el historial de la sede.' };
  }
}

/**
 * Elimina una sede.
 * - Si no tiene historial operativo (0 ventas, 0 pedidos, 0 cierres, 0 compras), desvincula perfiles y la borra físicamente.
 * - Si tiene historial contable u operativo, la desactiva (soft-delete) para proteger los datos fiscales y trazabilidad.
 */
export async function eliminarSede(sedeId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { error: 'Perfil no encontrado' };

  const historial = await getHistorialSede(sedeId);
  if ('error' in historial) {
    return { error: historial.error };
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Si tiene datos contables u operativos, no se puede eliminar físicamente
  if (!historial.puedeEliminarFisicamente) {
    const { error: softError } = await supabaseAdmin
      .from('sedes')
      .update({ estado_activo: false })
      .eq('id', sedeId)
      .eq('empresa_id', perfil.empresa_id);

    if (softError) {
      return { error: 'No se pudo desactivar la sede.' };
    }
    revalidatePath('/dashboard/configuracion/sedes');
    return {
      success: true,
      softDeleted: true,
      message: `La sede contiene registros operativos (${historial.ventas} ventas, ${historial.cierres} cierres). Por seguridad contable se desactivó y ocultó.`
    };
  }

  // Si no tiene historial operativo pero tiene usuarios asignados en perfiles,
  // reasignamos o liberamos sede_id para evitar la restricción FK
  if (historial.usuarios > 0) {
    const { data: otraSede } = await supabase
      .from('sedes')
      .select('id')
      .eq('empresa_id', perfil.empresa_id)
      .neq('id', sedeId)
      .eq('estado_activo', true)
      .limit(1)
      .maybeSingle();

    const nuevaSedeId = otraSede?.id || null;

    await supabaseAdmin
      .from('perfiles')
      .update({ sede_id: nuevaSedeId })
      .eq('empresa_id', perfil.empresa_id)
      .eq('sede_id', sedeId);
  }

  // Si tiene insumos o productos sin ventas, los eliminamos limpiamente
  if (historial.insumos > 0) {
    await supabaseAdmin.from('inventario_insumos').delete().eq('sede_id', sedeId);
  }
  if (historial.productos > 0) {
    await supabaseAdmin.from('productos').delete().eq('sede_id', sedeId);
  }

  // Eliminar sede físicamente
  const { error: delError } = await supabaseAdmin
    .from('sedes')
    .delete()
    .eq('id', sedeId)
    .eq('empresa_id', perfil.empresa_id);

  if (delError) {
    console.error('Error al eliminar sede físicamente:', delError);
    // Fallback: si aún hay alguna restricción, soft delete
    await supabaseAdmin
      .from('sedes')
      .update({ estado_activo: false })
      .eq('id', sedeId)
      .eq('empresa_id', perfil.empresa_id);

    revalidatePath('/dashboard/configuracion/sedes');
    return {
      success: true,
      softDeleted: true,
      message: 'La sede no se pudo eliminar por completo y ha sido desactivada.'
    };
  }

  revalidatePath('/dashboard/configuracion/sedes');
  return { success: true, message: 'Sede eliminada definitivamente de la base de datos.' };
}

/**
 * Activa una sede que estaba desactivada (soft-deleted).
 */
export async function activarSede(sedeId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) return { error: 'Perfil no encontrado' };

  const { error } = await supabase
    .from('sedes')
    .update({ estado_activo: true })
    .eq('id', sedeId)
    .eq('empresa_id', perfil.empresa_id);
    
  if (error) {
    console.error('Error al activar sede:', error);
    return { error: 'No se pudo activar la sede.' };
  }
  
  revalidatePath('/dashboard/configuracion/sedes');
  return { success: true, message: 'Sede reactivada exitosamente.' };
}



