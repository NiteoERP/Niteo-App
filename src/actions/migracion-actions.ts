'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function importarProductos(productosImport: any[], sedeId: string) {
  // Legacy support
  return procesarImportacionGenerica(productosImport.map(p => ({
    nombre: p.Nombre,
    codigo_barras: p['Cdigo de Barras']?.toString() || '',
    precio_venta: parseFloat(p['Precio de Venta']) || 0,
    costo: parseFloat(p['Costo']) || 0,
    precio_modificable: (p['Precio Modificable']?.toString().toUpperCase() === 'SI' || p['Precio Modificable'] === true),
    unidad_medida: p['Unidad de Medida'] || 'unidades'
  })), sedeId);
}

export async function exportarCatalogo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const { data: productos, error } = await supabase
    .from('productos')
    .select('nombre, codigo_barras, precio_venta, costo, precio_modificable, unidad_medida')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre');
  if (error) return { success: false, error: 'Error obteniendo catlogo' };
  return { success: true, data: productos };
}

export async function procesarImportacionGenerica(productos: any[], sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const nuevosProductos = productos.map((p: any) => ({
    empresa_id: perfil.empresa_id,
    sede_id: sedeId,
    nombre: p.nombre,
    codigo_barras: p.codigo_barras || '',
    precio_venta: parseFloat(p.precio_venta) || 0,
    costo: parseFloat(p.costo) || 0,
    precio_modificable: Boolean(p.precio_modificable),
    estado_activo: true,
    canal_venta: 'AMBOS',
    unidad_medida: p.unidad_medida || 'unidades'
  }));

  const { error } = await supabase.from('productos').insert(nuevosProductos);
  if (error) {
    console.error('Error importando productos generico:', error);
    return { success: false, error: 'Hubo un error importando el catlogo.' };
  }
  revalidatePath('/dashboard/inventario');
  return { success: true, count: nuevosProductos.length };
}

export async function procesarHistoricoAronium(facturas: any[], sedeId: string) {
  // facturas comes from Aronium .db processing in the frontend.
  // Each factura has { fecha, total, tipo, descuento, items: [...] }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  // This is a complex bulk insert.
  // For safety and speed in Supabase, we can use an RPC or just batch inserts.
  // We'll map them to pedidos (estado='cobrado') and detalles_pedido.
  // Since we might be inserting thousands of records, we will process them here.
  
  let successCount = 0;
  for (const f of facturas) {
    const { data: pedido, error: errP } = await supabase.from('pedidos').insert({
      empresa_id: perfil.empresa_id,
      sede_id: sedeId,
      cliente_id: null,
      nombre_eventual: f.nombre_eventual || 'Migracion Aronium',
      total: f.total,
      tipo_pedido: 'venta_rapida',
      estado: 'cobrado',
      fecha_creacion: f.fecha,
      descuento: f.descuento || 0
    }).select('id').single();

    if (errP || !pedido) {
      console.error('Error insertando factura:', errP);
      continue;
    }

    if (f.items && f.items.length > 0) {
      const itemsToInsert = f.items.map((i: any) => ({
        pedido_id: pedido.id,
        producto_id: null, // Si no tenemos el UUID exacto de Niteo
        nombre_custom: i.nombre,
        cantidad: i.cantidad,
        precio_unitario: i.precio,
        notas: 'Importado de Aronium'
      }));
      await supabase.from('detalles_pedido').insert(itemsToInsert);
    }
    successCount++;
  }

  revalidatePath('/dashboard/historial');
  return { success: true, count: successCount };
}
