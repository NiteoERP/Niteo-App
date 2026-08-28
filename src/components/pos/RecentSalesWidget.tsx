'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getVentasRecientes, VentaPOS } from '@/actions/pos-actions';
import { Receipt, CheckCircle2, ChevronRight, Store } from 'lucide-react';
import Link from 'next/link';

export default function RecentSalesWidget() {
  const [sales, setSales] = useState<VentaPOS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sedeId, setSedeId] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const savedPrivacy = localStorage.getItem('niteo_privacy_mode');
    if (savedPrivacy === 'true') setPrivacyMode(true);
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        const { data: profile } = await supabase.from('perfiles').select('sede_id').eq('id', user.id).single();
        if (profile?.sede_id) {
          setSedeId(profile.sede_id);
          const initial = await getVentasRecientes(profile.sede_id);
          setSales(initial.slice(0, 5));
        } else {
          // If no sede (e.g. Admin), optionally fetch all sales or leave empty
        }
      } catch (err) {
        console.error("Error loading recent sales:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitial();
  }, [supabase]);

  useEffect(() => {
    if (!sedeId) return;

    const channel = supabase
      .channel('realtime-widget-ventas')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas_facturas', filter: `id_sede=eq.${sedeId}` },
        (payload) => {
          const newVentaRaw = payload.new;
          
          const newVenta: VentaPOS = {
            id_factura: newVentaRaw.id_factura,
            id_pos: newVentaRaw.id_pos,
            numero_documento: newVentaRaw.numero_documento,
            fecha_venta: newVentaRaw.fecha_venta,
            total: newVentaRaw.total,
            descuento: newVentaRaw.descuento,
            tipo_documento: newVentaRaw.tipo_documento,
            esta_pagado: newVentaRaw.esta_pagado,
            detalles: [],
          };

          setSales((current) => {
            const updated = [newVenta, ...current];
            return updated.slice(0, 5);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sedeId, supabase]);

  const formatCurrency = (amount: number) => {
    if (privacyMode) return '****';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' USD';
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
        <h3 className="font-medium text-white flex items-center gap-2">
          <Store className="text-indigo-500" size={18} />
          Últimas Ventas (Live)
        </h3>
        <div className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-800">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-500 h-full flex flex-col justify-center items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mb-2"></div>
            <p className="text-sm">Cargando...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 h-full flex flex-col justify-center">
            <Receipt className="mx-auto h-8 w-8 opacity-20 mb-2" />
            <p className="text-sm">Esperando ventas...</p>
          </div>
        ) : (
          sales.map((sale) => (
            <div key={sale.id_factura} className="flex justify-between items-center p-3 hover:bg-neutral-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 shrink-0">
                  <Receipt size={14} />
                </div>
                <div>
                  <p className="text-neutral-200 text-sm font-medium flex items-center gap-1.5">
                    #{sale.numero_documento}
                    {sale.esta_pagado && <CheckCircle2 size={12} className="text-emerald-500" />}
                  </p>
                  <p className="text-neutral-500 text-xs mt-0.5">
                    {formatTime(sale.fecha_venta)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-neutral-200 font-bold text-sm">{formatCurrency(sale.total)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-neutral-800 bg-neutral-950/50">
        <Link 
          href="/dashboard/ventas" 
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors w-full p-1"
        >
          Ver Todas <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
