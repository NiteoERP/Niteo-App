'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BellRing, RefreshCw, Clock, User, ChefHat, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { obtenerMesasAbiertas, enviarComanda } from '@/actions/mesas-actions';
import type { TerminalVinculado } from './MesasHub';

interface Props {
  terminal: TerminalVinculado;
  meseroNombre: string;
  metodosPago: string[];
  onMesasLoaded?: (count: number) => void;
}

interface AlertaEnviada {
  mesaId: string;
  expiresAt: number;
}

const formatearBs = (monto: number): string => {
  const redondeado = Math.round(monto * 100) / 100;
  return redondeado.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function MesasAbiertas({ terminal, meseroNombre, metodosPago, onMesasLoaded }: Props) {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertasEnviadas, setAlertasEnviadas] = useState<AlertaEnviada[]>([]);
  const [enviandoAlerta, setEnviandoAlerta] = useState<string | null>(null);
  const [metodoPagoModal, setMetodoPagoModal] = useState<string | null>(null);

  const borderColorMesa = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 30) return 'border-emerald-500/40';
    if (diff < 60) return 'border-amber-500/40';
    return 'border-red-500/40';
  };

  const cargar = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else if (mesas.length === 0) setLoading(true);
    try {
      const data = await obtenerMesasAbiertas(terminal.sedeId);
      // Agrupar por mesa_identificador — quedar con la comanda más reciente de cada mesa
      const porMesa: Record<string, any> = {};
      for (const cmd of data) {
        const key = cmd.mesa_identificador as string;
        if (!porMesa[key] || new Date(cmd.created_at as string) > new Date(porMesa[key].created_at)) {
          porMesa[key] = cmd;
        }
      }
      setMesas(Object.values(porMesa).sort((a: any, b: any) =>
        String(a.mesa_identificador).localeCompare(String(b.mesa_identificador))
      ));
      onMesasLoaded?.(Object.values(porMesa).length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [terminal.sedeId]);

  useEffect(() => {
    cargar();
    const interval = setInterval(() => cargar(false), 15000);
    return () => clearInterval(interval);
  }, [cargar]);

  const alertaYaEnviada = (mesaId: string) =>
    alertasEnviadas.some(a => a.mesaId === mesaId && a.expiresAt > Date.now());

  const handleEnviarAlerta = async (mesa: any, metodo: string) => {
    setMetodoPagoModal(null);
    setEnviandoAlerta(mesa.mesa_identificador);
    try {
      await enviarComanda({
        terminalCode: terminal.terminalCode,
        tipo: 'alerta_pago',
        mesaIdentificador: mesa.mesa_identificador,
        clienteNombre: mesa.cliente_nombre || undefined,
        metodoPagoSugerido: metodo,
        items: [],
      });
      setAlertasEnviadas(prev => [
        ...prev.filter(a => a.mesaId !== mesa.mesa_identificador),
        { mesaId: mesa.mesa_identificador, expiresAt: Date.now() + 5 * 60 * 1000 },
      ]);
    } finally {
      setEnviandoAlerta(null);
    }
  };

  const formatTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'ahora mismo';
    if (diff < 60) return `hace ${diff} min`;
    return `hace ${Math.floor(diff / 60)}h ${diff % 60}min`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-500 text-sm">Cargando mesas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center justify-between px-1">
        <p className="text-neutral-500 text-xs">
          {mesas.length === 0
            ? 'No hay mesas abiertas'
            : `${mesas.length} mesa${mesas.length > 1 ? 's' : ''} abierta${mesas.length > 1 ? 's' : ''}`
          }
        </p>
        <button
          onClick={() => cargar(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-white text-xs transition-colors"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {mesas.length === 0 ? (
        <div className="text-center py-16">
          <ChefHat size={40} className="text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500">No hay mesas abiertas en este terminal</p>
          <p className="text-neutral-700 text-sm mt-1">Se actualizan automáticamente cada 15 segundos</p>
        </div>
      ) : (
        mesas.map((mesa: any) => {
          const items: any[] = Array.isArray(mesa.items) ? mesa.items : [];
          const total = Number(mesa.total) > 0 ? Number(mesa.total) : items.reduce((s: number, i: any) =>
            s + (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0), 0
          );
          const alertaEnviada = alertaYaEnviada(mesa.mesa_identificador);
          const enviando = enviandoAlerta === mesa.mesa_identificador;

          return (
            <div key={mesa.id} className={`bg-neutral-900 border ${borderColorMesa(mesa.created_at)} rounded-2xl p-4 space-y-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">
                      {/^(mesa|orden|pedido|barra|terraza|llevar)/i.test(String(mesa.mesa_identificador || '').trim()) || (mesa.cliente_nombre && String(mesa.cliente_nombre).startsWith(String(mesa.mesa_identificador)))
                        ? mesa.mesa_identificador
                        : `Mesa ${mesa.mesa_identificador}`}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      mesa.estado === 'pendiente'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-green-500/10 text-green-400 border border-green-500/20'
                    }`}>
                      {mesa.estado === 'pendiente' ? '⏳ Enviando' : '✅ Recibida'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {mesa.mesero_nombre && (
                      <span className="text-neutral-500 text-xs flex items-center gap-1">
                        <User size={11} /> {mesa.mesero_nombre}
                      </span>
                    )}
                    {mesa.cliente_nombre && (
                      <span className="text-neutral-500 text-xs">· {mesa.cliente_nombre}</span>
                    )}
                    <span className="text-neutral-600 text-xs flex items-center gap-1">
                      <Clock size={11} /> {formatTime(mesa.created_at)}
                    </span>
                    {mesa.tasa_efectiva > 0 && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                        Tasa: {formatearBs(mesa.tasa_efectiva)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {total > 0 && (
                    <div className="text-white font-black text-sm">
                      ${total.toFixed(2)}
                    </div>
                  )}
                  {((mesa.total_bs && mesa.total_bs > 0) || (mesa.tasa_efectiva && mesa.tasa_efectiva > 0 && total > 0)) && (
                    <div className="text-emerald-400 font-bold text-xs">
                      Bs. {formatearBs(mesa.total_bs || (total * mesa.tasa_efectiva))}
                    </div>
                  )}
                </div>
              </div>

              {items.length > 0 && (
                <div className="space-y-1.5 border-t border-neutral-800 pt-3">
                  {items.slice(0, 6).map((item: any, i: number) => {
                    const cant = Number(item.cantidad) || 0;
                    const precio = Number(item.precio_unitario) || 0;
                    const subtotalUSD = cant * precio;
                    const tasaItem = Number(item.tasa_efectiva) || Number(mesa.tasa_efectiva) || 0;
                    const subtotalBs = item.total_bs ? Number(item.total_bs) : (tasaItem > 0 ? subtotalUSD * tasaItem : 0);

                    return (
                      <div key={i} className="flex justify-between items-start text-sm gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-neutral-300 text-xs sm:text-sm font-medium leading-snug break-words whitespace-normal">
                            <span className="font-bold text-white mr-1.5">{cant}x</span>
                            {item.nombre}
                          </div>
                          {item.comentario && (
                            <p className="text-amber-400/90 text-xs mt-1 leading-snug break-words whitespace-pre-wrap bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                              📝 {item.comentario}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-neutral-300 text-xs font-semibold">
                            ${subtotalUSD.toFixed(2)}
                          </span>
                          {subtotalBs > 0 && (
                            <span className="text-emerald-400 text-[11px] font-bold block">
                              Bs. {formatearBs(subtotalBs)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {items.length > 6 && (
                    <p className="text-neutral-600 text-xs">+{items.length - 6} ítems más</p>
                  )}
                </div>
              )}

              <div className="pt-1">
                {alertaEnviada ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm justify-center py-2.5 bg-green-500/5 rounded-xl border border-green-500/20">
                    <CheckCircle2 size={16} />
                    Cajero notificado — verificando pago
                  </div>
                ) : (
                  <button
                    onClick={() => setMetodoPagoModal(mesa.mesa_identificador)}
                    disabled={enviando}
                    className="w-full bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/25 text-emerald-400 font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {enviando ? (
                      <><Loader2 size={15} className="animate-spin" /> Enviando alerta...</>
                    ) : (
                      <><BellRing size={15} /> Avisar al Cajero — Listo para Pagar</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Modal de método de pago */}
      {metodoPagoModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMetodoPagoModal(null)}
          />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto mb-5" />
            <h3 className="text-white font-bold text-lg mb-1">Método de Pago Sugerido</h3>
            <p className="text-neutral-500 text-sm mb-5">
              Mesa <span className="text-white font-medium">{metodoPagoModal}</span> — El cajero verificará antes de cobrar.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {metodosPago.map(m => (
                <button
                  key={m}
                  onClick={() => {
                    const mesaObj = mesas.find((x: any) => x.mesa_identificador === metodoPagoModal);
                    if (mesaObj) handleEnviarAlerta(mesaObj, m);
                  }}
                  className="bg-neutral-800 hover:bg-indigo-600 border border-neutral-700 hover:border-indigo-500 text-neutral-300 hover:text-white font-medium py-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard size={15} /> {m}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMetodoPagoModal(null)}
              className="w-full mt-4 text-neutral-600 text-sm py-2"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
