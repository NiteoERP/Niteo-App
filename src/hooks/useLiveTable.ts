import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useLiveTable(tableName: string, onUpdate: () => void, filter?: string) {
  const supabase = createClient();
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!tableName) return;

    const channelName = filter ? `live-${tableName}-${filter}` : `live-${tableName}`;

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName, filter: filter },
        (payload: any) => {
          console.log(`[Realtime] Cambio detectado en ${tableName}`, payload);
          if (onUpdateRef.current) onUpdateRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, filter]);
}
