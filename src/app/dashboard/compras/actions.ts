'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * FunciÃ³n interna de seguridad para extraer el contexto
 * y forzar arquitectura Multi-inquilino en el servidor.
 */
async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('No autorizado');

  const { data: perfil, error: perfErr } = await supabase
    .from('perfiles')
    .select('id_empresa, id_sede, auth_uuid')
    .eq('id', user.id)
    .single();

  if (perfErr || !perfil) throw new Error('Perfil de usuario no encontrado');

  return { supabase, user, idEmpresa: perfil.id_empresa, idSede: perfil.id_sede };
}

export async function getProveedoresYProductos() {
  try {
    const { supabase, idEmpresa } = await getAuthContext();

    const [provRes, prodRes] = await Promise.all([
      supabase.from('proveedores').select('id, nombre').eq('id_empresa', idEmpresa).order('nombre'),
      // Asumimos que los productos comparten el mismo id_empresa
      supabase.from('productos').select('id, nombre_producto, costo').eq('id_empresa', idEmpresa).order('nombre_producto')
    ]);

    return { 
      success: true, 
      proveedores: provRes.data || [], 
      productos: prodRes.data || [] 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function crearProveedor(nombre: string, rif: string = '') {
  try {
    const { supabase, idEmpresa } = await getAuthContext();

    const { data, error } = await supabase
      .from('proveedores')
      .insert([{ nombre, rif, id_empresa: idEmpresa }])
      .select('id, nombre')
      .single();

    if (error) throw error;
    return { success: true, proveedor: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getUltimasCompras() {
  try {
    const { supabase, idEmpresa } = await getAuthContext();

    const { data, error } = await supabase
      .from('compras_puntuales')
      .select('id, created_at, proveedor_comercio, detalles, documento_externo, monto_divisas, monto_bs_calculado')
      .eq('id_empresa', idEmpresa)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return { success: true, compras: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getTasaDelDia() {
  try {
    const { supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('tasas_cambio')
      .select('tasa_bcv')
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    // Si no hay datos, retornamos Ã©xito con tasa 0 para que el front no explote
    if (error && error.code !== 'PGRST116') throw error;
    
    return { success: true, tasa: data?.tasa_bcv || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getHistorialCompras(busqueda?: string, fechaInicio?: string, fechaFin?: string) {
  try {
    const { supabase, idEmpresa } = await getAuthContext();

    let query = supabase
      .from('compras_puntuales')
      .select('id, created_at, proveedor_comercio, detalles, documento_externo, monto_divisas, tasa_cambio, monto_bs_calculado, modalidad_pago')
      .eq('id_empresa', idEmpresa)
      .order('created_at', { ascending: false });

    if (busqueda) {
      query = query.or(`proveedor_comercio.ilike.%${busqueda}%,detalles.ilike.%${busqueda}%`);
    }
    if (fechaInicio) {
      query = query.gte('created_at', fechaInicio);
    }
    if (fechaFin) {
      // Add one day to include the entire end day
      const end = new Date(fechaFin);
      end.setDate(end.getDate() + 1);
      query = query.lt('created_at', end.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, compras: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function registrarCompraPuntual(data: {
  proveedor: string;
  montoDivisas: string;
  tasaCambio: string;
  detalles: string;
  metodoPago: string;
  documentoExterno: string;
  url_capture?: string;
}) {
  try {
    const { supabase, idEmpresa, user } = await getAuthContext();
    const montoBsCalculado = Number(data.montoDivisas) * Number(data.tasaCambio);

    const { error } = await supabase
      .from('compras_puntuales')
      .insert([{
        proveedor_comercio: data.proveedor,
        monto_divisas: Number(data.montoDivisas),
        tasa_cambio: Number(data.tasaCambio),
        monto_bs_calculado: montoBsCalculado,
        detalles: data.detalles,
        modalidad_pago: data.metodoPago,
        documento_externo: data.url_capture || data.documentoExterno, 
        id_empresa: idEmpresa,
        id_usuario: user.id
      }]);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarCompraPuntual(id_compra: number, data: {
  comercio_lugar: string;
  descripcion_gasto: string;
  monto_divisas: string;
  tasa_cambio: string;
  modalidad_pago: string;
  url_capture?: string;
}) {
  try {
    const { supabase, idEmpresa } = await getAuthContext();
    const montoBsCalculado = Number(data.monto_divisas) * Number(data.tasa_cambio);

    const { error } = await supabase
      .from('compras_puntuales')
      .update({
        proveedor_comercio: data.comercio_lugar,
        detalles: data.descripcion_gasto,
        monto_divisas: Number(data.monto_divisas),
        tasa_cambio: Number(data.tasa_cambio),
        monto_bs_calculado: montoBsCalculado,
        modalidad_pago: data.modalidad_pago,
        documento_externo: data.url_capture
      })
      .eq('id', id_compra)
      .eq('id_empresa', idEmpresa); // Seguridad estricta

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarCompraPuntual(id_compra: number) {
  try {
    const { supabase, idEmpresa } = await getAuthContext();
    // Borrado fÃ­sico
    const { error } = await supabase
      .from('compras_puntuales')
      .delete()
      .eq('id', id_compra)
      .eq('id_empresa', idEmpresa);
      
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function registrarFactura(
  idProveedor: string, 
  nroFactura: string, 
  productosFactura: any[]
) {
  try {
    const { supabase, idEmpresa, user, idSede } = await getAuthContext();

    const lineas = productosFactura.map(p => ({
      id_proveedor: idProveedor,
      nro_factura: nroFactura,
      id_producto: p.id_producto,
      cantidad: Number(p.cantidad),
      precio_unitario: Number(p.precio),
      total: Number(p.total),
      id_empresa: idEmpresa,
      id_sede: idSede,
      id_usuario: user.id
    }));

    const { error: insertErr } = await supabase.from('compras_mercancia').insert(lineas);
    if (insertErr) throw insertErr;

    for (const p of productosFactura) {
      if (p.id_producto) {
        const nuevoCostoUnitario = Number(p.precio); 
        await supabase
          .from('productos')
          .update({ costo: nuevoCostoUnitario })
          .eq('id', p.id_producto)
          .eq('id_empresa', idEmpresa);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

