import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Usamos el Service Role para cachear data de forma global (bypassing RLS), 
// ya que las funciones se filtran explcitamente por empresaId.
const getAdminClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key
  );
};

export const getCatalogoCachedInsumos = (empresaId: string, sedeId?: string) =>
  unstable_cache(
    async () => {
      const supabase = getAdminClient();
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
      const supabase = getAdminClient();
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
      const supabase = getAdminClient();
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
