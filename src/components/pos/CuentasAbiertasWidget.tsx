'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Users, Receipt, Clock, CircleDollarSign } from 'lucide-react';

interface CuentaAbierta {
  id: string;
  numero_documento: string;
  nombre_cuenta: string;
  total: number;
  fecha_apertura: string;
}

export default function CuentasAbiertasWidget({ sedeId }: { sedeId: string }) {
  const [cuentas, setCuentas] = useState<CuentaAbierta[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Función para cargar los datos iniciales
  const fetchCuentas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pos_cuentas_abiertas')
      .select('*')
      .eq('sede_id', sedeId)
      .order('fecha_apertura', { ascending: false });

    if (!error && data) {
      setCuentas(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCuentas();

    // Suscripción Realtime a la tabla
    const channel = supabase
      .channel('realtime_cuentas_abiertas')
      .on(
        'postgres_changes',
        {
          event: '*', // Insert, Update o Delete
          schema: 'public',
          table: 'pos_cuentas_abiertas',
          filter: `sede_id=eq.${sedeId}`
        },
        (payload) => {
          // Refrescar completamente al detectar cualquier cambio para mantener el estado "espejo" exacto
          fetchCuentas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sedeId]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-pulse text-indigo-400">Sincronizando mesas locales...</div>
      </div>
    );
  }

  if (cuentas.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center flex flex-col items-center">
        <Receipt size={48} className="text-neutral-700 mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">No hay cuentas abiertas</h3>
        <p className="text-neutral-500 max-w-sm">
          Todas las mesas y pedidos de tu local han sido cobrados o finalizados. Las nuevas cuentas aparecerán aquí en vivo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cuentas.map((cuenta) => (
        <div 
          key={cuenta.id} 
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm hover:border-indigo-500/50 transition-colors relative overflow-hidden group"
        >
          {/* Decorative indicator */}
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-white text-lg line-clamp-1" title={cuenta.nombre_cuenta}>
                {cuenta.nombre_cuenta}
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-500 bg-neutral-800 px-2 py-1 rounded-md">
              #{cuenta.numero_documento}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Clock size={14} /> Apertura
              </span>
              <span className="text-neutral-300">
                {new Date(cuenta.fecha_apertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-400">Total a Pagar</span>
              <span className="text-xl font-bold text-emerald-400 flex items-center gap-1">
                <CircleDollarSign size={18} className="text-emerald-500" />
                {cuenta.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
