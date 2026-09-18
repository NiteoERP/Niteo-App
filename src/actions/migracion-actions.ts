'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function importarProductos(productosImport: any[], sedeId: string) {
  return procesarImportacionUniversal(productosImport.map(p => ({
    nombre: p.Nombre,
    categoria: p['Categoría'] || p['Categoria'] || p['Rubro'] || p['Grupo'] || '',
    descripcion: p['Descripción'] || p['Descripcion'] || p['Detalle'] || '',
    codigo_barras: p['Código de Barras']?.toString() || '',
    precio_venta: parseFloat(p['Precio de Venta']) || 0,
    costo: parseFloat(p['Costo']) || 0,
    cantidad: (p['Cantidad'] !== undefined || p['Stock'] !== undefined || p['Cantidad en Inventario'] !== undefined)
      ? parseFloat(p['Cantidad'] ?? p['Stock'] ?? p['Cantidad en Inventario'])
      : null,
    precio_modificable: (p['Precio Modificable']?.toString().toUpperCase() === 'SI' || p['Precio Modificable'] === true),
    unidad_medida: p['Unidad de Medida'] || 'Und'
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
    .select('nombre, descripcion, codigo_barras, precio_venta, costo, precio_modificable')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre');
  if (error) return { success: false, error: 'Error obteniendo catálogo' };
  return { success: true, data: productos };
}

export async function procesarImportacionUniversal(productos: any[], sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  if (!productos || productos.length === 0) {
    return { success: false, error: 'No hay productos para importar.' };
  }

  const normalizarUnidad = (u?: string) => {
    const low = (u || '').toLowerCase().trim();
    if (low.startsWith('kg')) return 'Kg';
    if (low.startsWith('gr')) return 'Gr';
    if (low.startsWith('lt')) return 'Lt';
    if (low.startsWith('ml')) return 'Ml';
    if (low.startsWith('caj')) return 'Cajas';
    if (low.startsWith('paq')) return 'Paquetes';
    return 'Und';
  };

  // 1. Obtener insumos existentes en la sede para reutilizar o actualizar
  const { data: existingInsumos } = await supabase
    .from('inventario_insumos')
    .select('id, nombre, cantidad_actual, costo_promedio')
    .eq('empresa_id', perfil.empresa_id)
    .eq('sede_id', sedeId);

  const insumosMap = new Map<string, any>(
    (existingInsumos || []).map((ins: any) => [ins.nombre.trim().toLowerCase(), ins])
  );

  // 2. Obtener y auto-crear categorías para la empresa
  const { data: existingCategorias } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('empresa_id', perfil.empresa_id);

  const categoriasMap = new Map<string, string>(
    (existingCategorias || []).map((c: any) => [c.nombre.trim().toLowerCase(), c.id])
  );

  const catNamesToCreate = new Set<string>();
  for (const p of productos) {
    if (p.categoria && typeof p.categoria === 'string' && p.categoria.trim()) {
      const key = p.categoria.trim().toLowerCase();
      if (!categoriasMap.has(key)) {
        catNamesToCreate.add(p.categoria.trim());
      }
    }
  }

  for (const catName of catNamesToCreate) {
    const idPos = 'CAT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const { data: newCat, error: errCat } = await supabase
      .from('categorias')
      .insert({
        empresa_id: perfil.empresa_id,
        nombre: catName,
        id_pos: idPos,
        estado_activo: true,
        sede_id: sedeId || null
      })
      .select('id, nombre')
      .single();

    if (!errCat && newCat) {
      categoriasMap.set(catName.toLowerCase().trim(), newCat.id);
    }
  }

  let successCount = 0;

  // Procesamos en bloques
  const chunkSize = 50;
  for (let i = 0; i < productos.length; i += chunkSize) {
    const chunk = productos.slice(i, i + chunkSize);

    const prodsToInsert = chunk.map((p: any) => {
      const catKey = p.categoria ? p.categoria.toString().trim().toLowerCase() : '';
      const catId = catKey ? (categoriasMap.get(catKey) || null) : null;

      return {
        empresa_id: perfil.empresa_id,
        sede_id: sedeId,
        categoria_id: catId,
        nombre: p.nombre,
        descripcion: p.descripcion ? p.descripcion.toString().trim() : null,
        codigo_barras: p.codigo_barras || '',
        precio_venta: parseFloat(p.precio_venta) || 0,
        costo: parseFloat(p.costo) || 0,
        precio_modificable: Boolean(p.precio_modificable),
        estado_activo: true,
        canal_venta: 'AMBOS',
        es_reventa: true,
      };
    });

    const { data: insertedProds, error: prodErr } = await supabase
      .from('productos')
      .insert(prodsToInsert)
      .select('id, nombre, costo');

    if (prodErr || !insertedProds) {
      console.error('Error insertando productos:', prodErr);
      return { success: false, error: 'Hubo un error importando los productos: ' + (prodErr?.message || '') };
    }

    // Para cada producto insertado, gestionar insumo, receta y movimiento
    for (let idx = 0; idx < insertedProds.length; idx++) {
      const prodCreated = insertedProds[idx];
      const origItem = chunk[idx];
      const tieneCantidad = origItem.cantidad !== null && origItem.cantidad !== undefined && !isNaN(Number(origItem.cantidad));
      const stockInicial = tieneCantidad ? Math.max(0, Number(origItem.cantidad)) : 0;
      const keyNombre = prodCreated.nombre.trim().toLowerCase();

      let insumoId: string | null = null;
      let existing = insumosMap.get(keyNombre);

      if (existing) {
        insumoId = existing.id;
        if (tieneCantidad) {
          const nuevaCant = Number(existing.cantidad_actual || 0) + stockInicial;
          await supabase
            .from('inventario_insumos')
            .update({
              cantidad_actual: nuevaCant,
              costo_promedio: prodCreated.costo || existing.costo_promedio
            })
            .eq('id', existing.id);
          existing.cantidad_actual = nuevaCant;
        }
      } else {
        const { data: newIns, error: insErr } = await supabase
          .from('inventario_insumos')
          .insert({
            empresa_id: perfil.empresa_id,
            sede_id: sedeId,
            nombre: prodCreated.nombre,
            unidad_medida: normalizarUnidad(origItem.unidad_medida),
            costo_promedio: prodCreated.costo || 0,
            cantidad_actual: stockInicial,
          })
          .select('id, nombre, cantidad_actual, costo_promedio')
          .single();

        if (!insErr && newIns) {
          insumoId = newIns.id;
          insumosMap.set(keyNombre, newIns);
        }
      }

      // Enlazar insumo y receta al producto
      if (insumoId) {
        await Promise.all([
          supabase.from('productos').update({ id_insumo_vinculado: insumoId }).eq('id', prodCreated.id),
          supabase.from('recetas').insert({
            empresa_id: perfil.empresa_id,
            producto_id: prodCreated.id,
            insumo_id: insumoId,
            cantidad_necesaria: 1,
          })
        ]);

        // Registrar movimiento de inventario si hubo stock inicial
        if (stockInicial > 0) {
          await supabase.from('movimientos_inventario').insert({
            empresa_id: perfil.empresa_id,
            insumo_id: insumoId,
            usuario_id: user.id,
            tipo_movimiento: 'ENTRADA',
            cantidad: stockInicial,
            costo_perdido: 0,
            motivo: 'Migración inicial de inventario',
            fecha_movimiento: new Date().toISOString(),
          });
        }
      }

      successCount++;
    }
  }

  revalidatePath('/dashboard/inventario');
  revalidatePath('/dashboard/catalogo');
  return { success: true, count: successCount };
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

