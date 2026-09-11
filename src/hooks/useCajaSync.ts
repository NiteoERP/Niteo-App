import { useEffect, useRef, useState } from 'react';
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
  
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [onlineCount, setOnlineCount] = useState(0);

  // Ref para saber si el último cambio vino de la red (para no rebotarlo)
  const isRemoteRef = useRef(false);

  // Ref para tener los datos frescos en los eventos sin necesidad de re-suscribir
  const stateRef = useRef({ transacciones, metodos });
  useEffect(() => {
    stateRef.current = { transacciones, metodos };
  }, [transacciones, metodos]);

  useEffect(() => {
    if (!sedeId) return;

    setStatus('connecting');

    // Identificador único para este cliente en esta sesión
    const clientId = Math.random().toString(36).substring(7);

    const channel = supabase.channel(`caja-sync-${sedeId}`, {
      config: { 
        broadcast: { self: false },
        presence: { key: clientId }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        // Contar el número de clientes únicos
        setOnlineCount(Object.keys(newState).length);
      })
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
        // Alguien entró, le enviamos nuestro estado si tenemos datos
        const currentState = stateRef.current;
        if (currentState.transacciones.length > 0 || currentState.metodos.length > 5) {
          channel.send({ 
            type: 'broadcast', 
            event: 'state_update', 
            payload: currentState 
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('connected');
          // Reportamos nuestra presencia
          await channel.track({ online_at: new Date().toISOString() });
          // Solicitamos el estado actual si acabamos de entrar
          channel.send({ type: 'broadcast', event: 'request_state', payload: {} });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setStatus('disconnected');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      setStatus('disconnected');
    };
  }, [sedeId, setTransacciones, setMetodos]); 

  // Cuando nosotros editamos algo (localmente), enviamos el broadcast
  useEffect(() => {
    if (isRemoteRef.current) {
      // El cambio fue disparado por la red, no lo retransmitimos
      isRemoteRef.current = false;
      return;
    }

    if (channelRef.current && sedeId && status === 'connected') {
      try {
        if (channelRef.current.state === 'joined') {
          channelRef.current.send({
            type: 'broadcast',
            event: 'state_update',
            payload: { transacciones, metodos }
          });
        }
      } catch (err) {
        console.warn('CajaSync: No se pudo enviar el estado local', err);
      }
    }
  }, [transacciones, metodos, sedeId, status]);

  return { status, onlineCount };
}
