'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function importarProductos(productosImport: any[], sedeId: string) {
  return procesarImportacionGenerica(productosImport.map(p => ({
    nombre: p.Nombre,
    codigo_barras: p['Código de Barras']?.toString() || '',
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
  if (error) return { success: false, error: 'Error obteniendo catálogo' };
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
  if (error) return { success: false, error: 'Hubo un error importando el catálogo.' };
  revalidatePath('/dashboard/inventario');
  return { success: true, count: nuevosProductos.length };
}

export async function procesarEntidadesAronium(entidades: any, sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };
  
  let successCount = 0;

  // Insertar Metodos de Pago
  if (entidades.metodos && entidades.metodos.length > 0) {
     for (const m of entidades.metodos) {
       await supabase.from('metodos_pago').insert({
         empresa_id: perfil.empresa_id, sede_id: sedeId, nombre: m.Name, requiere_referencia: false, activo: true
       }).select('id').maybeSingle();
       successCount++;
     }
  }

  // Insertar Categorias
  if (entidades.categorias && entidades.categorias.length > 0) {
     for (const c of entidades.categorias) {
       await supabase.from('categorias').insert({
         empresa_id: perfil.empresa_id, sede_id: sedeId, nombre: c.Name, color: '#4F46E5', icono: 'Box'
       }).select('id').maybeSingle();
       successCount++;
     }
  }

  // Insertar Productos
  if (entidades.productos && entidades.productos.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < entidades.productos.length; i += chunkSize) {
      const batch = entidades.productos.slice(i, i + chunkSize).map((p: any) => ({
        empresa_id: perfil.empresa_id,
        sede_id: sedeId,
        nombre: p.Name,
        codigo_barras: p.Barcode || '',
        precio_venta: p.Price || 0,
        costo: p.Cost || 0,
        estado_activo: true,
        canal_venta: 'AMBOS'
      }));
      await supabase.from('productos').insert(batch);
      successCount += batch.length;
    }
  }

  return { success: true, count: successCount };
}

export async function procesarHistoricoAronium(facturas: any[], sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  let successCount = 0;
  for (const f of facturas) {
    const { data: pedido, error: errP } = await supabase.from('pedidos').insert({
      empresa_id: perfil.empresa_id,
      sede_id: sedeId,
      cliente_id: null,
      nombre_eventual: f.nombre_eventual || 'Migracion Aronium',
      total: f.total,
      tipo_pedido: f.tipo === 'compra' ? 'compra' : 'venta_rapida',
      estado: 'cobrado',
      fecha_creacion: f.fecha,
      descuento: f.descuento || 0
    }).select('id').single();

    if (errP || !pedido) continue;

    if (f.items && f.items.length > 0) {
      const itemsToInsert = f.items.map((i: any) => ({
        pedido_id: pedido.id,
        producto_id: null,
        nombre_custom: i.nombre,
        cantidad: i.cantidad,
        precio_unitario: i.precio,
        notas: 'Migración DB'
      }));
      await supabase.from('detalles_pedido').insert(itemsToInsert);
    }
    successCount++;
  }

  revalidatePath('/dashboard/historial');
  return { success: true, count: successCount };
}
