'use client';

import { createClient } from '@/utils/supabase/client';
import useSWR from 'swr';

const fetcher = async () => {
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
      .limit(50) // Paginación: Limitamos a 50
  ]);

  return {
    reasons: reasonsRes.data ?? [],
    mermas: mermasRes.data ?? []
  };
};

export function useMermasData() {
  const { data, error, isLoading, mutate } = useSWR(
    'mermasData',
    fetcher
  );

  return { 
    mermas: data?.mermas ?? [], 
    reasons: data?.reasons ?? [], 
    isLoading, 
    refetch: mutate 
  };
}
