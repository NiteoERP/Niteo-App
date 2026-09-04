'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * Función interna de seguridad para extraer el contexto
 * y forzar arquitectura Multi-inquilino en el servidor.
 */
async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('No autorizado');

  const { data: perfil, error: perfErr } = await supabase
    .from('perfiles')
    .select('empresa_id, sede_id, permisos, rol, nombre_completo')
    .eq('id', user.id)
    .single();

  if (perfErr || !perfil) throw new Error('Perfil de usuario no encontrado');

  const cookieStore = await cookies();
  const activeSedeCookie = cookieStore.get('active_sede')?.value;

  let idSede = perfil.sede_id;
  if (perfil.rol === 'MASTER' && activeSedeCookie) {
    idSede = activeSedeCookie;
  }

  const userRole = user.app_metadata?.user_role || perfil.rol || 'CAJERO';
  const userName = user.user_metadata?.full_name || perfil.nombre_completo || user.email;

  return { 
    supabase, 
    user, 
    idEmpresa: perfil.empresa_id, 
    idSede: perfil.sede_id,
    permisos: perfil.permisos || [],
    userRole,
    userName
  };
}

export async function getProveedoresYProductos() {
  try {
    const { supabase, idEmpresa } = await getAuthContext();

    const [provRes, prodRes] = await Promise.all([
      supabase.from('proveedores').select('id, nombre:nombre_comercial').eq('empresa_id', idEmpresa).order('nombre_comercial'),
      supabase.from('inventario_insumos').select('id, nombre, costo:costo_promedio').eq('empresa_id', idEmpresa).order('nombre')
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

export async function crearProductoBase(nombre: string) {
  try {
    const { supabase, idEmpresa, idSede } = await getAuthContext();
    const { data, error } = await supabase.from('inventario_insumos').insert({
      empresa_id: idEmpresa,
      sede_id: idSede || null,
      nombre: nombre,
      unidad_medida: 'Unidades',
      costo_promedio: 0,
      cantidad_actual: 0
    }).select('id, nombre, costo:costo_promedio').single();
    
    if (error) throw error;
    return { success: true, producto: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function crearProveedor(nombre: string, rif: string = '') {
  try {
    const { supabase, idEmpresa } = await getAuthContext();

    const { data, error } = await supabase.from('proveedores').insert([{ nombre_comercial: nombre, rif_cedula: rif, empresa_id: idEmpresa }]).select('id, nombre:nombre_comercial')
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
      .select('id, fecha_registro, proveedor, detalles, monto_divisas, monto_bs')
      .eq('id_empresa', idEmpresa)
      .order('fecha_registro', { ascending: false })
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
        .from('tasa_cambiaria')
        .select('tasa_bcv')
        .order('fecha', { ascending: false })
        .limit(1)
        .single();

    // Si no hay datos, retornamos ÃƒÂ©xito con tasa 0 para que el front no explote
    if (error && error.code !== 'PGRST116') throw error;
    
    return { success: true, tasa: data?.tasa_bcv || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getHistorialCompras(busqueda?: string, fechaInicio?: string, fechaFin?: string) {
  try {
    const { supabase, idEmpresa, user, userRole, permisos } = await getAuthContext();

    const canViewAll = userRole === 'MASTER' || permisos.includes('ver_todas_compras');

    let query = supabase
      .from('compras_puntuales')
      .select('id, fecha_registro, proveedor, detalles, monto_divisas, tasa_cambio, monto_bs, metodo_pago, usuario_id')
      .eq('id_empresa', idEmpresa)
      .order('fecha_registro', { ascending: false });

    if (!canViewAll) {
      query = query.eq('usuario_id', user.id);
    }

    if (busqueda) {
      query = query.or(`proveedor.ilike.%${busqueda}%,detalles.ilike.%${busqueda}%`);
    }
    if (fechaInicio) {
      query = query.gte('fecha_registro', fechaInicio);
    }
    if (fechaFin) {
      // Add one day to include the entire end day
      const end = new Date(fechaFin);
      end.setDate(end.getDate() + 1);
      query = query.lt('fecha_registro', end.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch operators names manually to avoid Supabase join errors
    const { data: perfiles } = await supabase.from('perfiles').select('id, nombre_completo').eq('empresa_id', idEmpresa);
    const userMap: Record<string, string> = {};
    perfiles?.forEach(p => { userMap[p.id] = p.nombre_completo; });

    const comprasMap = data?.map(c => {
      // FIX 5b: detalles se almacena como JSON string en compras de insumos.
      // Parseamos para extraer el texto legible antes de enviarlo al frontend.
      let concepto = c.detalles || '-';
      if (typeof concepto === 'string' && concepto.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(concepto);
          concepto = parsed.texto ?? parsed.descripcion ?? concepto;
        } catch (_) {
          // Si el parse falla, mantenemos el original (puede ser texto libre)
        }
      }
      return {
        ...c,
        raw_detalles: c.detalles, // Preserve original for parsing in client
        detalles: concepto,
        operador: (c as any).perfiles?.nombre_completo || userMap[c.usuario_id] || 'Desconocido',
      };
    }) || [];

    return { success: true, compras: comprasMap };
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
  fechaRegistro?: string;
}) {
  try {
    const { supabase, idEmpresa, idSede, user } = await getAuthContext();
    const montoBsCalculado = Number(data.montoDivisas) * Number(data.tasaCambio);

    const payload: any = {
      proveedor: data.proveedor,
      monto_divisas: Number(data.montoDivisas),
      tasa_cambio: Number(data.tasaCambio),
      monto_bs: montoBsCalculado,
      detalles: data.detalles,
      metodo_pago: data.metodoPago,
      id_empresa: idEmpresa,
      id_sede: idSede,
      usuario_id: user.id
    };

    if (data.fechaRegistro) {
      payload.fecha_registro = data.fechaRegistro;
    }

    const { error } = await supabase
      .from('compras_puntuales')
      .insert([payload]);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarCompraPuntual(id_compra: string, data: {
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
        proveedor: data.comercio_lugar,
        detalles: data.descripcion_gasto,
        monto_divisas: Number(data.monto_divisas),
        tasa_cambio: Number(data.tasa_cambio),
        monto_bs: montoBsCalculado,
        metodo_pago: data.modalidad_pago,
        /* documento_externo */
      })
      .eq('id', id_compra)
      .eq('id_empresa', idEmpresa); // Seguridad estricta

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarCompraPuntual(id_compra: string) {
  try {
    const { supabase, idEmpresa } = await getAuthContext();
    // Borrado fÃƒÂ­sico
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
  productosFactura: any[],
  fechaRegistro?: string
) {
  try {
    const { supabase, idEmpresa, user, idSede } = await getAuthContext();

    const { data: empData } = await supabase.from('empresas').select('metodo_costeo_despachos').eq('id', idEmpresa).single();
    const metodoCosteo = empData?.metodo_costeo_despachos || 'PROMEDIO';

    const lineas = productosFactura.map(p => {
      const payload: any = {
        id_proveedor: idProveedor,
        nro_factura: nroFactura,
        id_producto: p.id_producto,
        cantidad: Number(p.cantidad),
        precio_unitario: Number(p.precio),
        total: Number(p.total),
        id_empresa: idEmpresa,
        id_sede: idSede,
        id_usuario: user.id
      };
      if (fechaRegistro) {
        payload.created_at = fechaRegistro; // Asumiendo que la columna es created_at o fecha_registro. Verificaremos
      }
      return payload;
    });

      const { error: insertErr } = await supabase.from('compras_mercancia').insert(lineas);
      if (insertErr) throw insertErr;

      // ALSO create a debt in Proveedores (compras_facturas)
      const totalFactura = productosFactura.reduce((sum, p) => sum + Number(p.total), 0);
      const { error: fError } = await supabase.from('compras_facturas').insert({
        empresa_id: idEmpresa,
        sede_id: idSede,
        proveedor_id: idProveedor,
        numero_factura: nroFactura || 'S/N',
        concepto: 'Ingreso de Mercancía',
        total: totalFactura,
        saldo_pendiente: totalFactura, // Por defecto entra como deuda a Proveedores
        fecha_emision: fechaRegistro || new Date().toISOString(),
        usuario_id: user.id
      });
      if (fError) console.error('Error al registrar en compras_facturas:', fError);

        for (const p of productosFactura) {
        if (p.id_producto) {
          const nuevoCostoUnitario = Number(p.precio); 
          const cantidadComprada = Number(p.cantidad);

          // 1. Obtener el stock actual y costo actual del producto
          const { data: prodData } = await supabase
            .from('productos')
            .select('stock_actual, costo')
            .eq('id', p.id_producto)
            .eq('empresa_id', idEmpresa)
            .single();

          const stockActual = prodData?.stock_actual ? Number(prodData.stock_actual) : 0;
          const costoAnterior = prodData?.costo ? Number(prodData.costo) : 0;
          const nuevoStock = stockActual + cantidadComprada;

          let finalCosto = nuevoCostoUnitario;
          if (metodoCosteo === 'PROMEDIO' && nuevoStock > 0) {
             finalCosto = ((stockActual * costoAnterior) + (cantidadComprada * nuevoCostoUnitario)) / nuevoStock;
          }

          // 2. Actualizar costo y sumar al stock
          await supabase
            .from('productos')
            .update({ 
              costo: finalCosto,
              stock_actual: nuevoStock 
            })
            .eq('id', p.id_producto)
            .eq('empresa_id', idEmpresa);
        }
      }



    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
