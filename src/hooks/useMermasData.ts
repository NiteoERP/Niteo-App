'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect, useCallback } from 'react';

export function useMermasData() {
  const [mermas, setMermas] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    
    const supabase = createClient();
    
    const [reasonsRes, mermasRes] = await Promise.all([
      supabase
        .from('shrinkage_reasons')
        .select('*')
        .eq('is_active', true),
        
      supabase
        .from('shrinkages')
        .select(`
            *,
            shrinkage_reasons (name)
        `)
        .order('created_at', { ascending: false })
    ]);

    setReasons(reasonsRes.data ?? []);
    setMermas(mermasRes.data ?? []);
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { mermas, reasons, isLoading, refetch: fetchAll };
}
