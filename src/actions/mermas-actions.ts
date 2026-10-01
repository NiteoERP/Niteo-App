'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('No autorizado');

  let idEmpresa = user.app_metadata?.empresa_id || user.user_metadata?.empresa_id;
  if (!idEmpresa) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('perfiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();
    idEmpresa = profile?.empresa_id;
  }
  if (!idEmpresa) throw new Error('Sin empresa asignada');

  return { supabase, user, idEmpresa };
}

export async function fetchShrinkageReasonsAction() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('shrinkage_reasons')
      .select('*')
      .eq('is_active', true)
      .order('name');
      
    if (error) {
      console.error("Error fetching reasons:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error in fetchShrinkageReasonsAction:", err);
    return [];
  }
}

export interface MermaItem {
  id: string;
  empresa_id: string;
  sede_id?: string;
  insumo_id?: string;
  producto_id?: string;
  product_id?: number;
  reason_id?: string;
  quantity: number;
  unit_cost: number;
  total_loss: number;
  reported_by?: string;
  notes?: string;
  created_at: string;
  insumo_nombre?: string;
  insumo_unidad?: string;
  motivo_nombre?: string;
  operador_nombre?: string;
  es_producto?: boolean;
}

export async function getMermasInventario(empresaId: string, sedeId?: string): Promise<MermaItem[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('shrinkages')
      .select(`
        *,
        shrinkage_reasons (name),
        inventario_insumos (id, nombre, unidad_medida, sede_id),
        productos (id, nombre)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    if (sedeId) {
      query = query.eq('sede_id', sedeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching mermas:", error);
      return [];
    }

    // Obtener nombres de usuarios
    const userIds = [...new Set((data || []).map((m: any) => m.reported_by).filter(Boolean))];
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id, nombre_completo')
        .in('id', userIds);
      if (perfiles) {
        perfiles.forEach((p: any) => { userMap[p.id] = p.nombre_completo; });
      }
    }

    return (data || []).map((m: any) => {
      const esProducto = !!(m.producto_id || m.productos?.nombre);
      const nombreItem = esProducto
        ? (m.productos?.nombre || 'Producto terminado')
        : (m.inventario_insumos?.nombre || 'Insumo');
      const unidadItem = esProducto ? 'und' : (m.inventario_insumos?.unidad_medida || 'u');

      return {
        id: m.id,
        empresa_id: m.empresa_id,
        sede_id: m.sede_id,
        insumo_id: m.insumo_id,
        producto_id: m.producto_id,
        product_id: m.product_id,
        reason_id: m.reason_id,
        quantity: Number(m.quantity || 0),
        unit_cost: Number(m.unit_cost || 0),
        total_loss: Number(m.total_loss || (m.quantity * m.unit_cost) || 0),
        reported_by: m.reported_by,
        notes: m.notes || '',
        created_at: m.created_at,
        insumo_nombre: nombreItem,
        insumo_unidad: unidadItem,
        motivo_nombre: m.shrinkage_reasons?.name || 'Merma general',
        operador_nombre: userMap[m.reported_by] || 'Usuario',
        es_producto: esProducto
      };
    });
  } catch (err) {
    console.error("Error in getMermasInventario:", err);
    return [];
  }
}

export async function registrarMermaInsumo({
  insumoId,
  cantidad,
  reasonId,
  notes,
  sedeId
}: {
  insumoId: string;
  cantidad: number;
  reasonId?: string;
  notes?: string;
  sedeId?: string;
}) {
  try {
    const { supabase, user, idEmpresa } = await getAuthContext();

    if (!insumoId) throw new Error('Debes seleccionar un insumo.');
    if (!cantidad || cantidad <= 0) throw new Error('La cantidad de merma debe ser mayor a 0.');

    // 1. Obtener insumo actual
    const { data: insumo, error: insumoErr } = await supabase
      .from('inventario_insumos')
      .select('id, nombre, unidad_medida, costo_promedio, cantidad_actual, sede_id')
      .eq('id', insumoId)
      .single();

    if (insumoErr || !insumo) {
      throw new Error('El insumo seleccionado no existe.');
    }

    const cantActual = parseFloat(String(insumo.cantidad_actual || 0));
    if (cantActual < cantidad) {
      throw new Error(`Stock insuficiente. Solo tienes ${cantActual} ${insumo.unidad_medida} en stock pero intentas mermar ${cantidad}.`);
    }

    const costoUnit = parseFloat(String(insumo.costo_promedio || 0));
    const totalLoss = Number((cantidad * costoUnit).toFixed(4));
    const nuevaCantidad = Number((cantActual - cantidad).toFixed(4));

    // 2. Obtener nombre del motivo
    let motivoNombre = 'Merma / Pérdida';
    if (reasonId) {
      const { data: reasonData } = await supabase
        .from('shrinkage_reasons')
        .select('name')
        .eq('id', reasonId)
        .single();
      if (reasonData?.name) {
        motivoNombre = reasonData.name;
      }
    }

    // 3. Descontar stock del insumo
    const { error: updErr } = await supabase
      .from('inventario_insumos')
      .update({ cantidad_actual: nuevaCantidad })
      .eq('id', insumoId);

    if (updErr) throw updErr;

    // 4. Registrar en shrinkages (total_loss se genera automáticamente)
    const activeSede = sedeId || insumo.sede_id;
    const { data: mermaCreada, error: shrinkErr } = await supabase
      .from('shrinkages')
      .insert({
        empresa_id: idEmpresa,
        sede_id: activeSede || null,
        insumo_id: insumoId,
        reason_id: reasonId || null,
        quantity: cantidad,
        unit_cost: costoUnit,
        reported_by: user.id,
        notes: notes || null
      })
      .select()
      .single();

    if (shrinkErr) {
      console.warn('Advertencia insertando en shrinkages, intentando con admin client:', shrinkErr);
      const admin = createAdminClient();
      await admin.from('shrinkages').insert({
        empresa_id: idEmpresa,
        sede_id: activeSede || null,
        insumo_id: insumoId,
        reason_id: reasonId || null,
        quantity: cantidad,
        unit_cost: costoUnit,
        reported_by: user.id,
        notes: notes || null
      });
    }

    // 5. Registrar movimiento de inventario (tipo SALIDA, motivo MERMA)
    const detalleMov = `${motivoNombre}${notes ? ` - ${notes}` : ''}`;
    await supabase.from('movimientos_inventario').insert({
      empresa_id: idEmpresa,
      insumo_id: insumoId,
      usuario_id: user.id,
      tipo_movimiento: 'SALIDA',
      motivo: 'MERMA',
      cantidad: cantidad,
      costo_perdido: totalLoss,
      notas: detalleMov,
      fecha_movimiento: new Date().toISOString()
    });

    revalidatePath('/dashboard/inventario');
    revalidatePath('/dashboard/informes');
    revalidatePath('/dashboard/finanzas');

    return { 
      success: true, 
      merma: mermaCreada,
      insumoNombre: insumo.nombre,
      nuevoStock: nuevaCantidad,
      totalLoss
    };

  } catch (err: any) {
    console.error('Error registrando merma de insumo:', err);
    return { success: false, error: err.message || 'Error al registrar merma' };
  }
}

export interface IngredienteRecetaItem {
  insumo_id: string;
  nombre: string;
  unidad_medida: string;
  costo_promedio: number;
  stock_disponible: number;
  cantidad_necesaria: number; // Por cada unidad de producto
}

export async function fetchRecetaProductoAction(productoId: string): Promise<{
  success: boolean;
  hasRecipe: boolean;
  items: IngredienteRecetaItem[];
  costoEstimadoUnitario: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 1. Consultar ingredientes en la tabla recetas
    const { data: recItems, error } = await supabase
      .from('recetas')
      .select(`
        id,
        cantidad_necesaria,
        insumo_id,
        subproducto_id,
        inventario_insumos (id, nombre, unidad_medida, costo_promedio, cantidad_actual)
      `)
      .eq('producto_id', productoId);

    if (!error && recItems && recItems.length > 0) {
      const items: IngredienteRecetaItem[] = recItems
        .filter((r: any) => r.insumo_id && r.inventario_insumos)
        .map((r: any) => ({
          insumo_id: r.insumo_id,
          nombre: r.inventario_insumos?.nombre || 'Insumo',
          unidad_medida: r.inventario_insumos?.unidad_medida || 'u',
          costo_promedio: Number(r.inventario_insumos?.costo_promedio || 0),
          stock_disponible: Number(r.inventario_insumos?.cantidad_actual || 0),
          cantidad_necesaria: Number(r.cantidad_necesaria || 0),
        }));

      const costoEstimado = items.reduce((acc, i) => acc + (i.cantidad_necesaria * i.costo_promedio), 0);

      return {
        success: true,
        hasRecipe: items.length > 0,
        items,
        costoEstimadoUnitario: Number(costoEstimado.toFixed(4))
      };
    }

    // 2. Si no tiene recetas compuestas, verificar si tiene insumo vinculado (1 a 1 / Reventa)
    const { data: prod } = await supabase
      .from('productos')
      .select('id, nombre, id_insumo_vinculado, costo')
      .eq('id', productoId)
      .single();

    if (prod?.id_insumo_vinculado) {
      const { data: insumo } = await supabase
        .from('inventario_insumos')
        .select('id, nombre, unidad_medida, costo_promedio, cantidad_actual')
        .eq('id', prod.id_insumo_vinculado)
        .single();

      if (insumo) {
        const item: IngredienteRecetaItem = {
          insumo_id: insumo.id,
          nombre: insumo.nombre,
          unidad_medida: insumo.unidad_medida || 'und',
          costo_promedio: Number(insumo.costo_promedio || 0),
          stock_disponible: Number(insumo.cantidad_actual || 0),
          cantidad_necesaria: 1,
        };
        return {
          success: true,
          hasRecipe: true,
          items: [item],
          costoEstimadoUnitario: item.costo_promedio
        };
      }
    }

    return { 
      success: true, 
      hasRecipe: false, 
      items: [], 
      costoEstimadoUnitario: Number(prod?.costo || 0) 
    };

  } catch (err: any) {
    console.error('Error fetching receta de producto:', err);
    return { success: false, hasRecipe: false, items: [], costoEstimadoUnitario: 0, error: err.message };
  }
}

export async function registrarMermaProductoAction({
  productoId,
  cantidadProducto,
  reasonId,
  notes,
  sedeId,
  ingredientesPersonalizados,
  guardarRecetaEnProducto
}: {
  productoId: string;
  cantidadProducto: number;
  reasonId?: string;
  notes?: string;
  sedeId?: string;
  ingredientesPersonalizados?: { insumo_id: string; cantidad_necesaria: number }[];
  guardarRecetaEnProducto?: boolean;
}) {
  try {
    const { supabase, user, idEmpresa } = await getAuthContext();

    if (!productoId) throw new Error('Debes seleccionar un producto.');
    if (!cantidadProducto || cantidadProducto <= 0) throw new Error('La cantidad de producto debe ser mayor a 0.');

    // 1. Obtener detalles del producto
    const { data: producto, error: prodErr } = await supabase
      .from('productos')
      .select('id, nombre, costo, id_insumo_vinculado')
      .eq('id', productoId)
      .single();

    if (prodErr || !producto) throw new Error('El producto no fue encontrado.');

    // 2. Determinar ingredientes a descontar
    let listaIngredientes: { insumo_id: string; cantidad_necesaria: number }[] = [];

    if (ingredientesPersonalizados && ingredientesPersonalizados.length > 0) {
      listaIngredientes = ingredientesPersonalizados.filter(i => i.insumo_id && i.cantidad_necesaria > 0);

      // Si el usuario marcó guardar la receta en la ficha del producto
      if (guardarRecetaEnProducto) {
        await supabase.from('recetas').delete().eq('producto_id', productoId);
        const inserts = listaIngredientes.map(i => ({
          empresa_id: idEmpresa,
          producto_id: productoId,
          insumo_id: i.insumo_id,
          cantidad_necesaria: i.cantidad_necesaria
        }));
        await supabase.from('recetas').insert(inserts);
      }
    } else {
      // Consultar ingredientes de recetas
      const { data: recData } = await supabase
        .from('recetas')
        .select('insumo_id, cantidad_necesaria')
        .eq('producto_id', productoId);

      if (recData && recData.length > 0) {
        listaIngredientes = recData.map((r: any) => ({
          insumo_id: r.insumo_id,
          cantidad_necesaria: Number(r.cantidad_necesaria || 0)
        }));
      } else if (producto.id_insumo_vinculado) {
        listaIngredientes = [{
          insumo_id: producto.id_insumo_vinculado,
          cantidad_necesaria: 1
        }];
      }
    }

    if (listaIngredientes.length === 0) {
      throw new Error(`El producto "${producto.nombre}" no tiene ingredientes en su receta. Por favor agrega los insumos que componen este producto.`);
    }

    // 3. Obtener nombre del motivo
    let motivoNombre = 'Merma / Pérdida';
    if (reasonId) {
      const { data: reasonData } = await supabase
        .from('shrinkage_reasons')
        .select('name')
        .eq('id', reasonId)
        .single();
      if (reasonData?.name) {
        motivoNombre = reasonData.name;
      }
    }

    let costoTotalMerma = 0;
    const activeSede = sedeId || null;

    // 4. Descontar cada insumo de la receta del inventario y registrar movimiento
    for (const ing of listaIngredientes) {
      const cantADescontar = Number((ing.cantidad_necesaria * cantidadProducto).toFixed(4));
      if (cantADescontar <= 0) continue;

      const { data: insumo } = await supabase
        .from('inventario_insumos')
        .select('id, nombre, unidad_medida, costo_promedio, cantidad_actual')
        .eq('id', ing.insumo_id)
        .single();

      if (!insumo) continue;

      const cantActual = parseFloat(String(insumo.cantidad_actual || 0));
      const costoUnit = parseFloat(String(insumo.costo_promedio || 0));
      const costoPerdidoInsumo = Number((cantADescontar * costoUnit).toFixed(4));
      costoTotalMerma += costoPerdidoInsumo;

      const nuevaCantidad = Number((cantActual - cantADescontar).toFixed(4));

      // Actualizar stock del insumo
      await supabase
        .from('inventario_insumos')
        .update({ cantidad_actual: nuevaCantidad })
        .eq('id', ing.insumo_id);

      // Registrar movimiento de salida por cada insumo que componía el producto mermado
      const detalle = `Merma de Producto: ${producto.nombre} (x${cantidadProducto}) - ${motivoNombre}${notes ? ` - ${notes}` : ''}`;
      await supabase.from('movimientos_inventario').insert({
        empresa_id: idEmpresa,
        insumo_id: ing.insumo_id,
        usuario_id: user.id,
        tipo_movimiento: 'SALIDA',
        motivo: 'MERMA',
        cantidad: cantADescontar,
        costo_perdido: costoPerdidoInsumo,
        notas: detalle,
        fecha_movimiento: new Date().toISOString()
      });
    }

    // 5. Registrar el evento general de la merma en la tabla shrinkages
    const costoUnitarioProducto = cantidadProducto > 0 ? (costoTotalMerma / cantidadProducto) : 0;
    const notaGeneral = `Merma de Producto: ${producto.nombre} (x${cantidadProducto}) — Se descontaron ${listaIngredientes.length} insumos de su receta.${notes ? ` Causa: ${notes}` : ''}`;

    await supabase.from('shrinkages').insert({
      empresa_id: idEmpresa,
      sede_id: activeSede,
      producto_id: productoId,
      reason_id: reasonId || null,
      quantity: cantidadProducto,
      unit_cost: Number(costoUnitarioProducto.toFixed(4)),
      reported_by: user.id,
      notes: notaGeneral
    });

    revalidatePath('/dashboard/inventario');
    revalidatePath('/dashboard/informes');
    revalidatePath('/dashboard/finanzas');
    revalidatePath('/dashboard/catalogo');

    return {
      success: true,
      productoNombre: producto.nombre,
      insumosDescontados: listaIngredientes.length,
      costoTotalMerma: Number(costoTotalMerma.toFixed(2))
    };

  } catch (err: any) {
    console.error('Error registrando merma de producto:', err);
    return { success: false, error: err.message || 'Error al registrar merma de producto' };
  }
}

export async function revertirMermaInsumo(mermaId: string) {
  try {
    const { supabase, user, idEmpresa } = await getAuthContext();

    // 1. Consultar la merma
    const { data: merma, error: mErr } = await supabase
      .from('shrinkages')
      .select('*')
      .eq('id', mermaId)
      .eq('empresa_id', idEmpresa)
      .single();

    if (mErr || !merma) throw new Error('Registro de merma no encontrado.');

    // Caso A: Merma de un insumo individual
    if (merma.insumo_id) {
      const { data: insumo } = await supabase
        .from('inventario_insumos')
        .select('cantidad_actual')
        .eq('id', merma.insumo_id)
        .single();

      if (insumo) {
        const cantActual = parseFloat(String(insumo.cantidad_actual || 0));
        const nuevaCant = Number((cantActual + parseFloat(String(merma.quantity || 0))).toFixed(4));
        await supabase
          .from('inventario_insumos')
          .update({ cantidad_actual: nuevaCant })
          .eq('id', merma.insumo_id);

        await supabase.from('movimientos_inventario').insert({
          empresa_id: idEmpresa,
          insumo_id: merma.insumo_id,
          usuario_id: user.id,
          tipo_movimiento: 'ENTRADA',
          motivo: 'AJUSTE_INVENTARIO',
          cantidad: merma.quantity,
          costo_perdido: 0,
          notas: `Reversión de Merma #${mermaId.slice(0, 8)}`,
          fecha_movimiento: new Date().toISOString()
        });
      }
    }

    // Caso B: Merma de un producto elaborado completo (reintegrar todos los ingredientes)
    if (merma.producto_id) {
      const { data: recItems } = await supabase
        .from('recetas')
        .select('insumo_id, cantidad_necesaria')
        .eq('producto_id', merma.producto_id);

      if (recItems && recItems.length > 0) {
        for (const r of recItems) {
          if (!r.insumo_id) continue;
          const { data: insumo } = await supabase
            .from('inventario_insumos')
            .select('cantidad_actual')
            .eq('id', r.insumo_id)
            .single();

          if (insumo) {
            const cantReintegrar = Number((Number(r.cantidad_necesaria || 0) * Number(merma.quantity || 1)).toFixed(4));
            const cantActual = parseFloat(String(insumo.cantidad_actual || 0));
            await supabase
              .from('inventario_insumos')
              .update({ cantidad_actual: Number((cantActual + cantReintegrar).toFixed(4)) })
              .eq('id', r.insumo_id);

            await supabase.from('movimientos_inventario').insert({
              empresa_id: idEmpresa,
              insumo_id: r.insumo_id,
              usuario_id: user.id,
              tipo_movimiento: 'ENTRADA',
              motivo: 'AJUSTE_INVENTARIO',
              cantidad: cantReintegrar,
              costo_perdido: 0,
              notas: `Reversión de Merma de Producto #${mermaId.slice(0, 8)}`,
              fecha_movimiento: new Date().toISOString()
            });
          }
        }
      }
    }

    // 2. Eliminar de shrinkages
    const { error: delErr } = await supabase
      .from('shrinkages')
      .delete()
      .eq('id', mermaId)
      .eq('empresa_id', idEmpresa);

    if (delErr) {
      const admin = createAdminClient();
      await admin.from('shrinkages').delete().eq('id', mermaId).eq('empresa_id', idEmpresa);
    }

    revalidatePath('/dashboard/inventario');
    revalidatePath('/dashboard/informes');
    revalidatePath('/dashboard/finanzas');

    return { success: true };
  } catch (err: any) {
    console.error('Error al revertir merma:', err);
    return { success: false, error: err.message || 'Error al revertir merma' };
  }
}

// Funciones heredadas
export async function fetchShrinkagesAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shrinkages')
    .select(`
      *,
      shrinkage_reasons (name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching shrinkages:", error);
    return [];
  }
  return data || [];
}

export async function registerShrinkageAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado. Acceso denegado.");

  const productId = formData.get('product_id') as string;
  const reasonId = formData.get('reason_id') as string;
  const quantity = parseFloat(formData.get('quantity') as string);
  const unitCost = parseFloat(formData.get('unit_cost') as string);
  const notes = formData.get('notes') as string;

  const { error } = await supabase.rpc('register_shrinkage', {
    p_product_id: parseInt(productId),
    p_reason_id: reasonId,
    p_quantity: quantity,
    p_unit_cost: unitCost,
    p_notes: notes,
    p_user_id: user.id
  });

  if (error) {
    console.error("Error registering shrinkage:", error);
    throw new Error(error.message);
  }

  revalidatePath('/mermas');
  return { success: true };
}
