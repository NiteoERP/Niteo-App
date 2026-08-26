'use server'
import { getTasaBcvAction } from './config-actions';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers'; 
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
  const { data: profile } = await supabase.from('perfiles').select('empresa_id, sede_id, rol').eq('id', user.id).single();
  if (!profile) return { error: 'No se pudo obtener el perfil del usuario.' };

  const cookieStore = await cookies();
    const activeSedeCookie = cookieStore.get('active_sede')?.value;
    let activeSedeId = profile.sede_id;
    if (profile.rol === 'MASTER' && activeSedeCookie) {
      activeSedeId = activeSedeCookie;
    }
    if (!activeSedeId) {
    const { data: sedes } = await supabase.from('sedes').select('id').eq('empresa_id', profile.empresa_id).limit(1).single();
    if (sedes) activeSedeId = sedes.id;
    else return { error: 'Crea una sede primero.' };
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
        sede_id: activeSedeId,         
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
  const { data: profile } = await supabase.from('perfiles').select('empresa_id, sede_id, rol').eq('id', user.id).single();
  if (!profile) return [];

  const cookieStore = await cookies();
    const activeSedeCookie = cookieStore.get('active_sede')?.value;
    let activeSedeId = profile.sede_id;
    if (profile.rol === 'MASTER' && activeSedeCookie) {
      activeSedeId = activeSedeCookie;
    }
    if (!activeSedeId) {
    const { data: sedes } = await supabase.from('sedes').select('id').eq('empresa_id', profile.empresa_id).limit(1).single();
    if (sedes) activeSedeId = sedes.id;
  }    
  // Filtramos estrictamente por sede_id (tienda) para que no se crucen insumos   
  const { data, error } = await supabase     
    .from('inventario_insumos')     
    .select('id, nombre, unidad_medida')     
    .eq('sede_id', activeSedeId)     
    .order('nombre', { ascending: true })     
    .limit(50);    
  if (error) {     
    console.error('Error cargando insumos:', error);     
    return [];   
  }    
  return data; 
}    

export async function getTasaDelDia(): Promise<number> {   
  const data = await getTasaBcvAction();   
  return data.tasa || 36.50; 
} 

export async function registrarFacturaInsumos(factura: {   
  proveedor: string;   
  moneda: 'USD' | 'VES';   
  tasa: number;   
  items: Array<{     
    insumo_id: string | null;     
    is_new: boolean;     
    nombre_nuevo: string;     
    unidad_nueva: string;     
    cantidad: number;     
    costoTotal: number;   
  }>; 
}) {   
  const supabase = await createClient();   
  const { data: { user } } = await supabase.auth.getUser();   
  if (!user) return { error: 'No autorizado.' };    
  const { data: profile } = await supabase.from('perfiles').select('empresa_id, sede_id, rol').eq('id', user.id).single();
  if (!profile) return { error: 'Perfil no encontrado.' };

  const cookieStore = await cookies();
    const activeSedeCookie = cookieStore.get('active_sede')?.value;
    let activeSedeId = profile.sede_id;
    if (profile.rol === 'MASTER' && activeSedeCookie) {
      activeSedeId = activeSedeCookie;
    }
    if (!activeSedeId) {
    const { data: sedes } = await supabase.from('sedes').select('id').eq('empresa_id', profile.empresa_id).limit(1).single();
    if (sedes) activeSedeId = sedes.id;
    else return { error: 'Crea una sede primero.' };
  }    
  let montoTotalDivisas = 0;   
  let montoTotalBs = 0;    
  for (const item of factura.items) {     
    let costoUSD = item.costoTotal;     
    if (factura.moneda === 'VES') {       
      costoUSD = item.costoTotal / factura.tasa;     
    }     
    montoTotalDivisas += costoUSD;   
  }   
  montoTotalBs = montoTotalDivisas * factura.tasa;    
  const { data: header, error: headErr } = await supabase.from('compras_puntuales').insert({     
    id_empresa: profile.empresa_id,     
    id_sede: activeSedeId,     
    proveedor: factura.proveedor,     
    monto_divisas: montoTotalDivisas,     
    monto_bs: montoTotalBs,     
    tasa_cambio: factura.tasa,     
    detalles: JSON.stringify({ texto: `Compra Insumos - ${factura.items.length} items`, is_insumos: true, items: factura.items }),     
    metodo_pago: factura.moneda === 'USD' ? 'Efectivo USD' : 'Transferencia BS',     
    estado: 'PROCESADA'   
  }).select('id').single();    
  if (headErr) return { error: 'Error guardando factura: ' + headErr.message };    
  for (const item of factura.items) {     
    let idInsumo = item.insumo_id;     
    if (item.is_new && item.nombre_nuevo) {       
      const { data: newIns } = await supabase.from('inventario_insumos').insert({         
        empresa_id: profile.empresa_id,         
        sede_id: activeSedeId,         
        nombre: item.nombre_nuevo,         
        unidad_medida: item.unidad_nueva,         
        cantidad_actual: 0,         
        costo_promedio: 0       
      }).select('id').single();       
      if (newIns) idInsumo = newIns.id;     
    }      
    if (idInsumo) {       
      let usd = item.costoTotal;       
      if (factura.moneda === 'VES') usd = usd / factura.tasa;        
      await supabase.rpc('registrar_compra_insumo', {         
        p_insumo_id: idInsumo,         
        p_usuario_id: user.id,         
        p_cantidad: item.cantidad,         
        p_costo_total: usd       
      });     
    }   
  }    
  revalidatePath('/dashboard/inventario');   
  revalidatePath('/dashboard/compras');   
  return { success: true }; 
}






export async function editarFacturaInsumos(
  id_compra: string,
  factura: {
    proveedor: string;
    moneda: 'USD' | 'VES';
    tasa: number;
    metodo_pago: string;
    items_viejos: Array<{ insumo_id: string; cantidad: number; costoTotal: number }>;
    items_nuevos: Array<{
      insumo_id: string | null;
      is_new: boolean;
      nombre_nuevo: string;
      unidad_nueva: string;
      cantidad: number;
      costoTotal: number;
    }>;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado.' };
  const { data: profile } = await supabase.from('perfiles').select('empresa_id, sede_id, rol').eq('id', user.id).single();
  if (!profile) return { error: 'Perfil no encontrado.' };

  const cookieStore = await cookies();
    const activeSedeCookie = cookieStore.get('active_sede')?.value;
    let activeSedeId = profile.sede_id;
    if (profile.rol === 'MASTER' && activeSedeCookie) {
      activeSedeId = activeSedeCookie;
    }
    if (!activeSedeId) {
    const { data: sedes } = await supabase.from('sedes').select('id').eq('empresa_id', profile.empresa_id).limit(1).single();
    if (sedes) activeSedeId = sedes.id;
  }

  // 1. Revertir inventario de items viejos
  for (const oldItem of factura.items_viejos) {
    if (oldItem.insumo_id) {
      let usd = oldItem.costoTotal;
      if (factura.moneda === 'VES') usd = usd / factura.tasa;
      
      const { data: insumo } = await supabase.from('inventario_insumos').select('cantidad_actual, costo_promedio').eq('id', oldItem.insumo_id).single();
      if (insumo) {
         let newCant = Number(insumo.cantidad_actual) - Number(oldItem.cantidad);
         if (newCant < 0) newCant = 0;
         await supabase.from('inventario_insumos').update({ cantidad_actual: newCant }).eq('id', oldItem.insumo_id);
      }
    }
  }

  // 2. Procesar y aplicar nuevos items
  let montoTotalDivisas = 0;
  let montoTotalBs = 0;

  for (const item of factura.items_nuevos) {
    let costoUSD = item.costoTotal;
    if (factura.moneda === 'VES') {
      costoUSD = item.costoTotal / factura.tasa;
    }
    montoTotalDivisas += costoUSD;

    let idInsumo = item.insumo_id;
    if (item.is_new && item.nombre_nuevo) {
      const { data: newIns } = await supabase.from('inventario_insumos').insert({
        empresa_id: profile.empresa_id,
        sede_id: activeSedeId,
        nombre: item.nombre_nuevo,
        unidad_medida: item.unidad_nueva,
        cantidad_actual: 0,
        costo_promedio: 0
      }).select('id').single();
      if (newIns) idInsumo = newIns.id;
    }

    if (idInsumo) {
      item.insumo_id = idInsumo; // Actualizar para guardar en el JSON final
      await supabase.rpc('registrar_compra_insumo', {
        p_insumo_id: idInsumo,
        p_usuario_id: user.id,
        p_cantidad: item.cantidad,
        p_costo_total: costoUSD
      });
    }
  }

  montoTotalBs = montoTotalDivisas * factura.tasa;

  // 3. Actualizar la metadata de la compra puntual
  const { error: headErr } = await supabase.from('compras_puntuales').update({
    proveedor: factura.proveedor,
    monto_divisas: montoTotalDivisas,
    monto_bs: montoTotalBs,
    tasa_cambio: factura.tasa,
    detalles: JSON.stringify({ 
      texto: `Compra Insumos - ${factura.items_nuevos.length} items`, 
      is_insumos: true, 
      items: factura.items_nuevos 
    }),
    metodo_pago: factura.metodo_pago
  }).eq('id', id_compra);

  if (headErr) return { error: 'Error actualizando compra: ' + headErr.message };

  revalidatePath('/dashboard/inventario');
  revalidatePath('/dashboard/compras');
  return { success: true };
}

