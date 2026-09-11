'use client';

import { createClient } from '@/utils/supabase/client';
import useSWR from 'swr';

const fetcher = async (empresaId: string) => {
  const supabase = createClient();
  const [comprasRes, proveedoresRes] = await Promise.all([
    supabase
      .from('compras_puntuales')
      .select('id, fecha_registro, proveedor, detalles, monto_divisas, monto_bs')
      .eq('id_empresa', empresaId)
      .order('fecha_registro', { ascending: false })
      .limit(50),
      
    supabase
      .from('proveedores')
      .select('id, nombre:nombre_comercial')
      .eq('empresa_id', empresaId)
      .order('nombre_comercial')
  ]);
  
  return {
    compras: comprasRes.data ?? [],
    proveedores: proveedoresRes.data ?? []
  };
};

export function useComprasData(empresaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    empresaId ? `comprasData-${empresaId}` : null,
    () => fetcher(empresaId!)
  );

  return { 
    compras: data?.compras ?? [], 
    proveedores: data?.proveedores ?? [], 
    isLoading, 
    refetch: mutate 
  };
}
