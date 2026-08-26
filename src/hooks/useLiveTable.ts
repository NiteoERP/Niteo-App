import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useLiveTable(tableName: string, onUpdate: () => void) {
  const supabase = createClient();
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!tableName) return;

    const channel = supabase.channel(`live-${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          console.log(`[Realtime] Cambio detectado en ${tableName}`, payload);
          if (onUpdateRef.current) onUpdateRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName]);
}
