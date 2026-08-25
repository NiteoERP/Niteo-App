'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Users, Receipt, Clock, CircleDollarSign, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';

interface CuentaAbiertaDetalle {
  producto: string;
  cantidad: number;
  total: number;
}

interface CuentaAbierta {
  id: string;
  sede_id: string;
  numero_documento: string;
  nombre_cuenta: string;
  total: number;
  fecha_apertura: string;
  detalles?: CuentaAbiertaDetalle[];
}

export default function CuentasAbiertasWidget({ sedeId }: { sedeId: string }) {
  const [cuentas, setCuentas] = useState<CuentaAbierta[]>([]);
  const [sedesMap, setSedesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supabase = createClient();

  // Función para cargar los datos iniciales
  const fetchCuentas = async () => {
    setLoading(true);

    // Cargar sedes para el mapeo
    const { data: sedesData } = await supabase.from('sedes').select('id, nombre_sede');
    if (sedesData) {
      const sMap: Record<string, string> = {};
      sedesData.forEach(s => sMap[s.id] = s.nombre_sede);
      setSedesMap(sMap);
    }

    let query = supabase
      .from('pos_cuentas_abiertas')
      .select('*')
      .order('fecha_apertura', { ascending: false });
      
    if (sedeId && sedeId !== 'ALL') {
      query = query.eq('sede_id', sedeId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setCuentas(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCuentas();

    // Suscripción Realtime a la tabla
    let filterStr = undefined;
    if (sedeId && sedeId !== 'ALL') {
      filterStr = `sede_id=eq.${sedeId}`;
    }

    const channel = supabase
      .channel('realtime_cuentas_abiertas')
      .on(
        'postgres_changes',
        {
          event: '*', // Insert, Update o Delete
          schema: 'public',
          table: 'pos_cuentas_abiertas',
          filter: filterStr
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCuentas((prev) => {
              const exists = prev.find((c) => c.id === payload.new.id);
              if (exists) return prev;
              const newState = [payload.new as CuentaAbierta, ...prev];
              return newState.sort((a, b) => new Date(b.fecha_apertura).getTime() - new Date(a.fecha_apertura).getTime());
            });
          } else if (payload.eventType === 'DELETE') {
            setCuentas((prev) => prev.filter((c) => c.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setCuentas((prev) => prev.map((c) => (c.id === payload.new.id ? (payload.new as CuentaAbierta) : c)));
          }
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
      {cuentas.map((cuenta) => {
        const isExpanded = expandedId === cuenta.id;
        
        // Defensive parsing for detalles
        let detallesArray: CuentaAbiertaDetalle[] = [];
        try {
          if (typeof cuenta.detalles === 'string') {
            detallesArray = JSON.parse(cuenta.detalles);
          } else if (Array.isArray(cuenta.detalles)) {
            detallesArray = cuenta.detalles;
          } else if (cuenta.detalles && typeof cuenta.detalles === 'object') {
            // In case it's an object with an items array or something similar
            detallesArray = (cuenta.detalles as any).items || Object.values(cuenta.detalles);
          }
        } catch (e) {
          console.error("Error parsing detalles for cuenta", cuenta.id, e);
        }
        
        return (
          <div 
            key={cuenta.id} 
            className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-sm hover:border-indigo-500/50 transition-all relative overflow-hidden group flex flex-col"
          >
            {/* Decorative indicator */}
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

            <div className="p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : cuenta.id)}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400">
                    <Users size={20} />
                  </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-white text-lg line-clamp-1" title={cuenta.nombre_cuenta}>
                    {cuenta.nombre_cuenta}
                  </h3>
                  {sedeId === 'ALL' && (
                    <span className="text-xs text-indigo-400 font-medium mt-0.5">
                      {sedesMap[cuenta.sede_id] || 'Sucursal'}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-800 px-2 py-1 rounded-md shrink-0">
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
                
                {/* Expand Toggle */}
                {detallesArray && detallesArray.length > 0 && (
                  <div className="pt-2 flex justify-center text-neutral-500 hover:text-indigo-400 transition-colors">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                )}
              </div>
            </div>

            {/* Expanded Content (Items) */}
            {isExpanded && detallesArray && detallesArray.length > 0 && (
              <div className="bg-neutral-950 px-5 py-4 border-t border-neutral-800 max-h-60 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag size={14} className="text-neutral-400" />
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Productos en curso</span>
                </div>
                <div className="space-y-2">
                  {detallesArray.map((item: any, idx: number) => {
                    const cant = item.cantidad || item.Quantity || 1;
                    const prodName = item.producto || item.Product || item.ProductName || 'Producto Desconocido';
                    const tot = item.total || item.Total || 0;
                    const price = cant > 0 ? (tot / cant) : 0;
                    
                    return (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="flex flex-col">
                          <span className="text-neutral-200 line-clamp-1">{prodName}</span>
                          <span className="text-xs text-neutral-500">{cant} x ${price.toFixed(2)}</span>
                        </div>
                        <span className="text-neutral-300 font-mono">${tot.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
