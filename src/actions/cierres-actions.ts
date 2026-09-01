'use server'

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// ============================================================================
// 1. OBTENER DATOS PREVIOS DEL SISTEMA PARA EL CIERRE
// ============================================================================
export async function getCierrePrevio(fechaStr: string, requestedSedeId?: string) {
  const supabase = await createClient();

  // Obtener la sesión y el perfil para saber la sede
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error("Perfil no encontrado");

  const targetSedeId = requestedSedeId || profile.sede_id;
  if (!targetSedeId) throw new Error("Debe seleccionar una sede para consultar el cierre");

  // 1. Consultar la Tasa de Cambio Automática (la más reciente)
  let tasaCambio = 36.50; // Valor de fallback
  const { data: tasaData } = await supabase
    .from('tasa_cambiaria')
    .select('tasa_bcv')
    .order('fecha', { ascending: false })
    .limit(1)
    .single();
    
  if (tasaData && tasaData.tasa_bcv) {
    tasaCambio = Number(tasaData.tasa_bcv);
  }

  // 2. Sumar Ventas del Día (de Niteo Sync)
  const { data: ventasData } = await supabase
    .from('ventas_facturas')
    .select('total')
    .eq('sede_id', targetSedeId)
    .gte('fecha_venta', `${fechaStr}T00:00:00.000Z`)
    .lte('fecha_venta', `${fechaStr}T23:59:59.999Z`);
  
  const ventasTotales = ventasData ? ventasData.reduce((acc, curr) => acc + Number(curr.total), 0) : 0;

  // 3. Sumar Gastos Operativos del Día
  const { data: gastosData } = await supabase
    .from('gastos_sede')
    .select('monto')
    .eq('sede_id', targetSedeId)
    .gte('fecha_gasto', `${fechaStr}T00:00:00.000Z`)
    .lte('fecha_gasto', `${fechaStr}T23:59:59.999Z`);
  
  const gastosTotales = gastosData ? gastosData.reduce((acc, curr) => acc + Number(curr.monto), 0) : 0;

  // Total Esperado por el Sistema = Ventas - Gastos
  const totalEsperado = ventasTotales - gastosTotales;

  return {
    tasaCambio,
    ventasTotales,
    gastosTotales,
    totalEsperado,
    targetSedeId
  };
}

// ============================================================================
// 2. GUARDAR EL CIERRE Y LAS TRANSACCIONES BANCARIAS
// ============================================================================
export async function guardarCierre(cierreData: any, transacciones: any[]) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const finalSedeId = cierreData.sede_id || profile.sede_id;
  if (!finalSedeId) return { error: "No se especificó la sede para el cierre." };

  // 1. Insertar en la Tabla Maestra (cierres_caja)
  const { data: nuevoCierre, error: errorCierre } = await supabase
      .from('cierres_caja')
    .insert({
      empresa_id: profile.empresa_id,
      sede_id: finalSedeId,
      usuario_id: user.id,
      fecha_cierre: cierreData.fecha_cierre,
      tasa_cambio: cierreData.tasa_cambio,
      sistema_ventas_brutas: cierreData.sistema_ventas_brutas,
      sistema_gastos_operativos: cierreData.sistema_gastos_operativos,
      sistema_total_esperado: cierreData.sistema_total_esperado,
      real_efectivo_bs: cierreData.real_efectivo_bs,
      real_efectivo_usd: cierreData.real_efectivo_usd,
      real_bancos_bs: cierreData.real_bancos_bs,
      real_bancos_usd: cierreData.real_bancos_usd,
      diferencia_total: cierreData.diferencia_total
    })
    .select('id')
    .single();

  if (errorCierre) {
    console.error('Error insertando cierre:', errorCierre);
    // Verificar si es error de constraint unique (ya cerró hoy)
    if (errorCierre.code === '23505') {
       return { error: 'Ya existe un cierre de caja registrado para esta fecha y sede.' };
    }
    return { error: 'Error al registrar el resumen del cierre. Detalles: ' + errorCierre.message + ' ' + (errorCierre.details || '') };
  }

  // 2. Insertar las Transacciones Bancarias (Bulk Insert) si hay alguna
  if (transacciones.length > 0) {
    const transaccionesConId = transacciones.map(t => ({
      cierre_id: nuevoCierre.id,
      metodo: t.metodo,
      banco: t.banco,
      referencia: t.referencia,
      monto: t.monto,
      moneda: t.moneda
    }));

    const { error: errorTransacciones } = await supabase
        .from('cierres_transacciones')
      .insert(transaccionesConId);

    if (errorTransacciones) {
      console.error('Error insertando transacciones:', errorTransacciones);
      // Opcional: Aquí se podría hacer un rollback borrando el cierre, pero dejemos el log por ahora
      return { error: 'El cierre guardó el resumen, pero hubo un error guardando los bancos. Detalles: ' + errorTransacciones.message + ' ' + (errorTransacciones.details || '') };
    }
  }

  revalidatePath('/dashboard/cierre');
  return { success: true };
}




export async function getBancosUtilizados(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return {};
  
  const { data, error } = await supabase
    .from('cierres_transacciones')
    .select('banco, metodo, cierres_caja!inner(empresa_id)')
    .not('banco', 'is', null)
    .neq('banco', 'N/A')
    .eq('cierres_caja.empresa_id', profile.empresa_id)
    .limit(500);
    
  if (error || !data) return {};
  
  const map: Record<string, Set<string>> = {};
  for (const d of data) {
    if (!d.banco || !d.metodo) continue;
    const b = d.banco.trim();
    if (b === '' || b === 'N/A') continue;
    if (!map[d.metodo]) map[d.metodo] = new Set();
    map[d.metodo].add(b);
  }

  const result: Record<string, string[]> = {};
  for (const [m, set] of Object.entries(map)) {
    result[m] = Array.from(set).sort();
  }

  return result;
}

// ============================================================================
// 3. OBTENER HISTORIAL DE CIERRES
// ============================================================================
export async function getHistorialCierres(sedeId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('perfiles').select('empresa_id, sede_id, rol').eq('id', user.id).single();
  if (!profile) return [];

  let query = supabase
    .from('cierres_caja')
    .select('*, sedes(nombre_sede)')
    .eq('cierres_caja.empresa_id', profile.empresa_id)
    .order('fecha_cierre', { ascending: false });

  // Si no es MASTER, forzar su sede
  if (profile.rol !== 'MASTER') {
    query = query.eq('sede_id', profile.sede_id);
  } else if (sedeId && sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return [];
  }
  
  if (!data || data.length === 0) return [];

  // Mapear nombres de usuario manualmente desde perfiles ya que la FK apunta a auth.users
  const userIds = [...new Set(data.map(c => c.usuario_id))];
  const { data: perfilesData } = await supabase
    .from('perfiles')
    .select('id, nombre_completo')
    .in('id', userIds);

  const perfilMap = new Map();
  if (perfilesData) {
    perfilesData.forEach(p => perfilMap.set(p.id, p.nombre_completo));
  }

  return data.map(c => ({
    ...c,
    usuarios: { nombre: perfilMap.get(c.usuario_id) || 'Cajero' }
  }));
}

// ============================================================================
// ACTUALIZAR CIERRE EXISTENTE
// ============================================================================
export async function actualizarCierre(cierreId: string, cierreData: any, transacciones: any[]) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  const cookieStore = await cookies();
  const hasOverride = cookieStore.get('supervisor_override')?.value === 'true';
  if (profile?.rol !== 'MASTER' && !hasOverride) {
    return { error: 'No tienes permisos para modificar cierres.' };
  }
  // Si usó el override, lo consumimos (borramos la cookie) para que no quede abierta
  if (hasOverride && profile?.rol !== 'MASTER') {
    cookieStore.delete('supervisor_override');
  }

  // 1. Actualizar la Tabla Maestra (cierres_caja)
  const { error: errorCierre } = await supabase
    .from('cierres_caja')
    .update({
      real_efectivo_bs: cierreData.real_efectivo_bs,
      real_efectivo_usd: cierreData.real_efectivo_usd,
      real_bancos_bs: cierreData.real_bancos_bs,
      real_bancos_usd: cierreData.real_bancos_usd,
      diferencia_total: cierreData.diferencia_total
    })
    .eq('id', cierreId);

  if (errorCierre) {
    console.error('Error actualizando cierre:', errorCierre);
    return { error: 'Error al actualizar el resumen del cierre. Detalles: ' + errorCierre.message };
  }

  // 2. Eliminar transacciones anteriores
  const { error: errorDel } = await supabase
    .from('cierres_transacciones')
    .delete()
    .eq('cierre_id', cierreId);

  if (errorDel) {
    console.error('Error eliminando transacciones viejas:', errorDel);
    return { error: 'Error al limpiar transacciones antiguas.' };
  }

  // 3. Insertar nuevas transacciones
  if (transacciones.length > 0) {
    const transaccionesConId = transacciones.map(t => ({
      cierre_id: cierreId,
      metodo: t.metodo,
      banco: t.banco,
      referencia: t.referencia,
      monto: t.monto,
      moneda: t.moneda
    }));

    const { error: errorTransacciones } = await supabase
      .from('cierres_transacciones')
      .insert(transaccionesConId);

    if (errorTransacciones) {
      console.error('Error insertando transacciones:', errorTransacciones);
      return { error: 'El cierre se actualizó a medias (error en los bancos). Detalles: ' + errorTransacciones.message };
    }
  }

  revalidatePath('/dashboard/caja');
  revalidatePath(`/dashboard/caja/${cierreId}`);
  return { success: true };
}


// ============================================================================
// ELIMINAR CIERRE (Solo MASTER)
// ============================================================================
export async function eliminarCierre(cierreId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'MASTER') {
    return { error: 'No tienes permisos para eliminar cierres.' };
  }

  // 1. Eliminar transacciones (On Delete Cascade suele estar, pero por si acaso lo hacemos manual)
  await supabase.from('cierres_transacciones').delete().eq('cierre_id', cierreId);

  // 2. Eliminar el Cierre
  const { error } = await supabase.from('cierres_caja').delete().eq('id', cierreId);

  if (error) {
    console.error('Error eliminando cierre:', error);
    return { error: 'Ocurrió un error al intentar eliminar el cierre. Detalles: ' + error.message };
  }

  revalidatePath('/dashboard/caja');
  return { success: true };
}


// ============================================================================
// VERIFICAR SUPERVISOR (Para permitir a cajeros editar)
// ============================================================================
export async function verifySupervisor(password: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { error: "Perfil no encontrado" };

  // Buscar el email del MASTER de esta empresa
  const { data: masterProfile } = await supabase
    .from('perfiles')
    .select('id, rol')
    .eq('cierres_caja.empresa_id', profile.empresa_id)
    .eq('rol', 'MASTER')
    .single();

  if (!masterProfile) return { error: "No se encontró un MASTER para esta empresa." };

  // Para obtener el email del MASTER necesitamos permisos de admin, 
  // pero podemos usar una llamada RPC o buscar en auth.users si tuviéramos acceso.
  // En Niteo, los usuarios normales no pueden leer auth.users.
  // ALTERNATIVA: Usar la clave de servicio para obtener el email del MASTER.
  const supabaseAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: masterUser, error: adminErr } = await supabaseAdmin.auth.admin.getUserById(masterProfile.id);
  
  if (adminErr || !masterUser?.user?.email) {
    return { error: "No se pudo resolver el correo del MASTER." };
  }

  // Ahora intentamos hacer login temporal sin afectar la sesión actual
  const tempClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false }
  });

  const { error: loginError } = await tempClient.auth.signInWithPassword({
    email: masterUser.user.email,
    password: password
  });

  if (loginError) {
    return { error: "Contraseña incorrecta." };
  }

  // Si fue exitoso, creamos una cookie de permiso temporal por 15 minutos
  const cookieStore = await cookies();
  cookieStore.set('supervisor_override', 'true', { maxAge: 15 * 60, path: '/' });
  return { success: true };
}


// ============================================================================
// OBTENER MÉTODOS CUSTOM HISTÓRICOS DE UNA SEDE
// ============================================================================
export async function getMetodosHistorialSede(sedeId: string) {
  const supabase = await createClient();
  
  // Como no podemos hacer un join fácil y un distinct en PostgREST puro de forma sencilla para esta consulta,
  // y como los cierres por sede tampoco son millones aún, traemos los cierres recientes de esa sede.
  const { data: cierres } = await supabase
    .from('cierres_caja')
    .select('id')
    .eq('sede_id', sedeId)
    .order('created_at', { ascending: false })
    .limit(30); // Miramos los últimos 30 cierres

  if (!cierres || cierres.length === 0) return [];

  const cierreIds = cierres.map(c => c.id);

  const { data: txs } = await supabase
    .from('cierres_transacciones')
    .select('metodo')
    .in('cierre_id', cierreIds);

  if (!txs) return [];

  const uniqueMetodos = [...new Set(txs.map(t => t.metodo))];
  
  // Filtramos los por defecto
  const defaultIds = ['Efectivo', 'Punto de Venta', 'Pago Móvil'];
  return uniqueMetodos.filter(m => !defaultIds.includes(m));
}

export async function getCierreParaEditar(cierreId: string) {
  const supabase = await createClient();
  const { data: cierre, error } = await supabase
    .from('cierres_caja')
    .select('*')
    .eq('id', cierreId)
    .single();

  if (error || !cierre) return null;

  const { data: transacciones } = await supabase
    .from('cierres_transacciones')
    .select('*')
    .eq('cierre_id', cierreId);

  return { cierre, transacciones: transacciones || [] };
}
