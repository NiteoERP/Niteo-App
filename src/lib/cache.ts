import { unstable_cache } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export const getCatalogoCachedInsumos = (empresaId: string, sedeId?: string) =>
  unstable_cache(
    async () => {
      const supabase = await createClient();
      let query = supabase
        .from('inventario_insumos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nombre');

      if (sedeId) {
        query = query.eq('sede_id', sedeId);
      }

      const { data } = await query;
      return data ?? [];
    },
    [`insumos-${empresaId}${sedeId ? `-${sedeId}` : ''}`],
    {
      revalidate: 300, // 5 minutos
      tags: [`insumos-${empresaId}${sedeId ? `-${sedeId}` : ''}`],
    }
  )();

export const getCatalogoProductos = (empresaId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, codigo_barras, precio_venta, descripcion, es_compuesto, costo, estado_activo')
        .eq('empresa_id', empresaId)
        .order('nombre');
      return data ?? [];
    },
    [`productos-${empresaId}`],
    {
      revalidate: 600, // 10 minutos
      tags: [`productos-${empresaId}`],
    }
  )();

export const getSedesCached = (empresaId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from('sedes')
        .select('id, nombre_sede')
        .eq('empresa_id', empresaId);
      return data ?? [];
    },
    [`sedes-${empresaId}`],
    {
      revalidate: 1800, // 30 minutos
      tags: [`sedes-${empresaId}`],
    }
  )();
