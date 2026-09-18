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

export type ModoDuplicados = 'actualizar' | 'omitir' | 'duplicar';

export async function analizarImportacionProductos(productos: any[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  const { data: existingProds } = await supabase
    .from('productos')
    .select('id, nombre, codigo_barras')
    .eq('empresa_id', perfil.empresa_id);

  const existingByName = new Set<string>(
    (existingProds || []).map((p: any) => (p.nombre ? p.nombre.trim().toLowerCase() : ''))
  );
  const existingByBarcode = new Set<string>(
    (existingProds || [])
      .filter((p: any) => p.codigo_barras && String(p.codigo_barras).trim().length > 0)
      .map((p: any) => String(p.codigo_barras).trim())
  );

  const duplicados: string[] = [];
  let nuevosCount = 0;

  for (const p of productos) {
    const rawName = p.nombre ? String(p.nombre).trim().toLowerCase() : '';
    const rawBarcode = p.codigo_barras ? String(p.codigo_barras).trim() : '';

    const isMatch = (rawName && existingByName.has(rawName)) || (rawBarcode && existingByBarcode.has(rawBarcode));
    if (isMatch) {
      if (p.nombre && !duplicados.includes(p.nombre.trim())) {
        duplicados.push(p.nombre.trim());
      }
    } else {
      nuevosCount++;
    }
  }

  return {
    success: true,
    total: productos.length,
    existentesCount: duplicados.length,
    nuevosCount,
    ejemplosExistentes: duplicados.slice(0, 5)
  };
}

export async function limpiarProductosDuplicados() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  // Obtener todos los productos ordenados cronológicamente
  const { data: allProds, error } = await supabase
    .from('productos')
    .select('id, nombre, codigo_barras, id_insumo_vinculado, created_at')
    .eq('empresa_id', perfil.empresa_id)
    .order('created_at', { ascending: true });

  if (error || !allProds) return { success: false, error: 'Error consultando catálogo' };

  const groups = new Map<string, any[]>();
  for (const p of allProds) {
    const key = p.nombre ? p.nombre.trim().toLowerCase() : '';
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  let deletedCount = 0;
  for (const [_, prods] of groups) {
    if (prods.length > 1) {
      // Priorizar el producto que tenga insumo vinculado o código de barras
      const sorted = [...prods].sort((a, b) => {
        if (a.id_insumo_vinculado && !b.id_insumo_vinculado) return -1;
        if (!a.id_insumo_vinculado && b.id_insumo_vinculado) return 1;
        if (a.codigo_barras && !b.codigo_barras) return -1;
        if (!a.codigo_barras && b.codigo_barras) return 1;
        return 0;
      });

      const [_, ...duplicates] = sorted;
      const idsToDelete = duplicates.map(d => d.id);

      // Eliminar recetas de los duplicados para evitar error de FK
      await supabase.from('recetas').delete().in('producto_id', idsToDelete);
      
      const { error: delErr } = await supabase.from('productos').delete().in('id', idsToDelete);
      if (!delErr) {
        deletedCount += idsToDelete.length;
      }
    }
  }

  revalidatePath('/dashboard/catalogo');
  revalidatePath('/dashboard/inventario');
  return { success: true, count: deletedCount };
}

export async function procesarImportacionUniversal(
  productos: any[],
  sedeId: string,
  modoDuplicados: ModoDuplicados = 'actualizar'
) {
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

  // 3. Consultar productos existentes en la empresa para resolver duplicados
  const { data: existingProductsDB } = await supabase
    .from('productos')
    .select('id, nombre, codigo_barras, costo, precio_venta, categoria_id, descripcion, id_insumo_vinculado')
    .eq('empresa_id', perfil.empresa_id);

  const existingByName = new Map<string, any>(
    (existingProductsDB || []).map((p: any) => [(p.nombre || '').trim().toLowerCase(), p])
  );
  const existingByBarcode = new Map<string, any>(
    (existingProductsDB || [])
      .filter((p: any) => p.codigo_barras && String(p.codigo_barras).trim().length > 0)
      .map((p: any) => [String(p.codigo_barras).trim(), p])
  );

  const usedBarcodes = new Set<string>(
    (existingProductsDB || [])
      .filter((p: any) => p.codigo_barras && String(p.codigo_barras).trim().length > 0)
      .map((p: any) => String(p.codigo_barras).trim())
  );

  let createdCount = 0;
  let updatedCount = 0;
  let omittedCount = 0;

  const toInsert: any[] = [];
  const toUpdate: { existing: any; item: any }[] = [];

  for (const p of productos) {
    const rawBarcode = p.codigo_barras ? String(p.codigo_barras).trim() : '';
    const rawName = p.nombre ? String(p.nombre).trim().toLowerCase() : '';
    const existing = (rawBarcode ? existingByBarcode.get(rawBarcode) : null) || (rawName ? existingByName.get(rawName) : null);

    if (existing && modoDuplicados !== 'duplicar') {
      if (modoDuplicados === 'omitir') {
        omittedCount++;
        continue;
      } else if (modoDuplicados === 'actualizar') {
        toUpdate.push({ existing, item: p });
        continue;
      }
    }

    toInsert.push(p);
  }

  // A. Procesar Actualizaciones de productos existentes
  for (const { existing, item } of toUpdate) {
    const catKey = item.categoria ? item.categoria.toString().trim().toLowerCase() : '';
    const catId = catKey ? (categoriasMap.get(catKey) || null) : null;
    const rawDesc = item.descripcion ? String(item.descripcion).trim() : '';

    let barcodeVal: string | null = null;
    if (item.codigo_barras) {
      const rawCode = String(item.codigo_barras).trim();
      if (rawCode.length > 0) {
        if (!usedBarcodes.has(rawCode) || existing.codigo_barras === rawCode) {
          barcodeVal = rawCode;
          usedBarcodes.add(rawCode);
        }
      }
    }

    const updates: any = {};
    if (item.precio_venta !== undefined && item.precio_venta !== null && !isNaN(item.precio_venta) && item.precio_venta > 0) {
      updates.precio_venta = parseFloat(item.precio_venta);
    }
    if (item.costo !== undefined && item.costo !== null && !isNaN(item.costo) && item.costo > 0) {
      updates.costo = parseFloat(item.costo);
    }
    if (catId) updates.categoria_id = catId;
    if (rawDesc) updates.descripcion = rawDesc;
    if (barcodeVal) updates.codigo_barras = barcodeVal;

    if (Object.keys(updates).length > 0) {
      await supabase.from('productos').update(updates).eq('id', existing.id);
    }

    // Gestionar Stock del producto actualizado
    const tieneCantidad = item.cantidad !== null && item.cantidad !== undefined && !isNaN(Number(item.cantidad));
    if (tieneCantidad) {
      const stockEntrante = Math.max(0, Number(item.cantidad));
      const keyNombre = (existing.nombre || '').trim().toLowerCase();
      let existingIns = insumosMap.get(keyNombre);

      if (existingIns) {
        const nuevaCant = Number(existingIns.cantidad_actual || 0) + stockEntrante;
        await supabase
          .from('inventario_insumos')
          .update({
            cantidad_actual: nuevaCant,
            costo_promedio: updates.costo || existingIns.costo_promedio
          })
          .eq('id', existingIns.id);
        existingIns.cantidad_actual = nuevaCant;

        if (stockEntrante > 0) {
          await supabase.from('movimientos_inventario').insert({
            empresa_id: perfil.empresa_id,
            insumo_id: existingIns.id,
            usuario_id: user.id,
            tipo_movimiento: 'ENTRADA',
            cantidad: stockEntrante,
            costo_perdido: 0,
            motivo: 'Actualización de stock desde migración Excel',
            fecha_movimiento: new Date().toISOString(),
          });
        }
      } else {
        const { data: newIns } = await supabase
          .from('inventario_insumos')
          .insert({
            empresa_id: perfil.empresa_id,
            sede_id: sedeId,
            nombre: existing.nombre,
            unidad_medida: normalizarUnidad(item.unidad_medida),
            costo_promedio: updates.costo || existing.costo || 0,
            cantidad_actual: stockEntrante,
          })
          .select('id, nombre, cantidad_actual, costo_promedio')
          .single();

        if (newIns) {
          insumosMap.set(keyNombre, newIns);
          await Promise.all([
            supabase.from('productos').update({ id_insumo_vinculado: newIns.id }).eq('id', existing.id),
            supabase.from('recetas').insert({
              empresa_id: perfil.empresa_id,
              producto_id: existing.id,
              insumo_id: newIns.id,
              cantidad_necesaria: 1,
            })
          ]);

          if (stockEntrante > 0) {
            await supabase.from('movimientos_inventario').insert({
              empresa_id: perfil.empresa_id,
              insumo_id: newIns.id,
              usuario_id: user.id,
              tipo_movimiento: 'ENTRADA',
              cantidad: stockEntrante,
              costo_perdido: 0,
              motivo: 'Actualización de stock desde migración Excel',
              fecha_movimiento: new Date().toISOString(),
            });
          }
        }
      }
    }

    updatedCount++;
  }

  // B. Procesar Inserciones en Lotes para nuevos productos
  const chunkSize = 50;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);

    const prodsToInsert = chunk.map((p: any) => {
      const catKey = p.categoria ? p.categoria.toString().trim().toLowerCase() : '';
      const catId = catKey ? (categoriasMap.get(catKey) || null) : null;

      let barcodeVal: string | null = null;
      if (p.codigo_barras) {
        const rawCode = String(p.codigo_barras).trim();
        if (rawCode.length > 0) {
          if (!usedBarcodes.has(rawCode)) {
            barcodeVal = rawCode;
            usedBarcodes.add(rawCode);
          }
        }
      }

      const rawDesc = p.descripcion ? String(p.descripcion).trim() : '';

      return {
        empresa_id: perfil.empresa_id,
        sede_id: sedeId,
        categoria_id: catId,
        nombre: p.nombre ? String(p.nombre).trim() : 'Producto Sin Nombre',
        descripcion: rawDesc.length > 0 ? rawDesc : null,
        codigo_barras: barcodeVal,
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

      createdCount++;
    }
  }

  revalidatePath('/dashboard/inventario');
  revalidatePath('/dashboard/catalogo');
  return {
    success: true,
    count: createdCount + updatedCount,
    createdCount,
    updatedCount,
    omittedCount
  };
}

/**
 * Importa un listado de categorías desde Excel.
 */
export async function importarCategorias(categoriasList: { nombre: string }[], sedeId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };
  const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!perfil) return { success: false, error: 'Perfil no encontrado' };

  if (!categoriasList || categoriasList.length === 0) {
    return { success: false, error: 'No hay categorías para importar.' };
  }

  // Consultar categorías existentes para no duplicar
  const { data: existing } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('empresa_id', perfil.empresa_id);

  const existingSet = new Set((existing || []).map((c: any) => c.nombre.trim().toLowerCase()));

  let count = 0;
  for (const cat of categoriasList) {
    const rawName = cat.nombre ? cat.nombre.toString().trim() : '';
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    if (existingSet.has(key)) continue;

    const idPos = 'CAT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const { error } = await supabase.from('categorias').insert({
      empresa_id: perfil.empresa_id,
      sede_id: sedeId || null,
      nombre: rawName,
      id_pos: idPos,
      estado_activo: true
    });

    if (!error) {
      existingSet.add(key);
      count++;
    }
  }

  revalidatePath('/dashboard/catalogo');
  return { success: true, count };
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

  // Insertar o sincronizar Categorias
  const catPosMap = new Map<string, string>(); // Id en Aronium -> id UUID en Supabase
  if (entidades.categorias && entidades.categorias.length > 0) {
     for (const c of entidades.categorias) {
       const idPos = (c.Id ?? ('CAT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6))).toString();
       
       const { data: existing } = await supabase
         .from('categorias')
         .select('id')
         .eq('empresa_id', perfil.empresa_id)
         .ilike('nombre', c.Name)
         .maybeSingle();

       let catId: string | null = existing?.id || null;

       if (!catId) {
         const { data: newCat, error: errCat } = await supabase.from('categorias').insert({
           empresa_id: perfil.empresa_id,
           sede_id: sedeId || null,
           nombre: c.Name,
           id_pos: idPos,
           estado_activo: true
         }).select('id').maybeSingle();

         if (!errCat && newCat) {
           catId = newCat.id;
         }
       }

       if (catId) {
         if (c.Id !== undefined && c.Id !== null) {
           catPosMap.set(c.Id.toString(), catId);
         }
         catPosMap.set(c.Name.toLowerCase().trim(), catId);
       }
       successCount++;
     }
  }

  // Insertar Productos
  if (entidades.productos && entidades.productos.length > 0) {
    const { data: existingCodesAronium } = await supabase
      .from('productos')
      .select('codigo_barras')
      .eq('empresa_id', perfil.empresa_id)
      .not('codigo_barras', 'is', null);

    const usedBarcodesAronium = new Set<string>(
      (existingCodesAronium || [])
        .map((c: any) => c.codigo_barras ? String(c.codigo_barras).trim() : '')
        .filter((b: string) => b.length > 0)
    );

    const chunkSize = 200;
    for (let i = 0; i < entidades.productos.length; i += chunkSize) {
      const batch = entidades.productos.slice(i, i + chunkSize).map((p: any) => {
        const catRef = (p.ProductGroupId ?? p.categoria_id ?? p.categoria)?.toString();
        const categoria_id = catRef ? (catPosMap.get(catRef) || catPosMap.get(catRef.toLowerCase().trim()) || null) : null;

        let barcodeVal: string | null = null;
        if (p.Barcode) {
          const raw = String(p.Barcode).trim();
          if (raw.length > 0 && !usedBarcodesAronium.has(raw)) {
            barcodeVal = raw;
            usedBarcodesAronium.add(raw);
          }
        }

        return {
          empresa_id: perfil.empresa_id,
          sede_id: sedeId,
          categoria_id,
          nombre: p.Name,
          codigo_barras: barcodeVal,
          precio_venta: p.Price || 0,
          costo: p.Cost || 0,
          estado_activo: true,
          canal_venta: 'AMBOS',
          es_reventa: true
        };
      });
      await supabase.from('productos').insert(batch);
      successCount += batch.length;
    }
  }

  revalidatePath('/dashboard/catalogo');
  revalidatePath('/dashboard/inventario');
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

