'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect, useCallback } from 'react';

export function useComprasData(empresaId: string | null) {
  const [compras, setCompras] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    
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

    setCompras(comprasRes.data ?? []);
    setProveedores(proveedoresRes.data ?? []);
    
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { compras, proveedores, isLoading, refetch: fetchAll };
}
