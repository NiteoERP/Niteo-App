import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useCajaSync(
  sedeId: string, 
  transacciones: any[], 
  setTransacciones: (t: any[]) => void,
  metodos: any[],
  setMetodos: (m: any[]) => void
) {
  const supabase = createClient();
  const channelRef = useRef<any>(null);
  
  // Ref para saber si el último cambio vino de la red (para no rebotarlo)
  const isRemoteRef = useRef(false);

  // Ref para tener los datos frescos en los eventos sin necesidad de re-suscribir
  const stateRef = useRef({ transacciones, metodos });
  useEffect(() => {
    stateRef.current = { transacciones, metodos };
  }, [transacciones, metodos]);

  useEffect(() => {
    if (!sedeId) return;

    const channel = supabase.channel(`caja-sync-${sedeId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'state_update' }, (payload) => {
        isRemoteRef.current = true;
        if (payload.payload.transacciones) {
          setTransacciones(payload.payload.transacciones);
        }
        if (payload.payload.metodos) {
          setMetodos(payload.payload.metodos);
        }
      })
      .on('broadcast', { event: 'request_state' }, () => {
        // Alguien entró (ej. el Master), le enviamos nuestro estado si tenemos datos
        const currentState = stateRef.current;
        if (currentState.transacciones.length > 0 || currentState.metodos.length > 5) {
          channel.send({ 
            type: 'broadcast', 
            event: 'state_update', 
            payload: currentState 
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Solicitamos el estado actual si acabamos de entrar
          channel.send({ type: 'broadcast', event: 'request_state', payload: {} });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sedeId, setTransacciones, setMetodos]); 

  // Cuando nosotros editamos algo (localmente), enviamos el broadcast
  useEffect(() => {
    if (isRemoteRef.current) {
      // El cambio fue disparado por la red, no lo retransmitimos
      isRemoteRef.current = false;
      return;
    }

    if (channelRef.current && sedeId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'state_update',
        payload: { transacciones, metodos }
      });
    }
  }, [transacciones, metodos, sedeId]);
}
