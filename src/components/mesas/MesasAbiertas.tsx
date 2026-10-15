'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BellRing,
  RefreshCw,
  Clock,
  User,
  ChefHat,
  CreditCard,
  CheckCircle2,
  Loader2,
  PlusCircle,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { obtenerMesasAbiertas, enviarComanda, cancelarItemMesa } from '@/actions/mesas-actions';
import type { TerminalVinculado } from './MesasHub';

interface Props {
  terminal: TerminalVinculado;
  meseroNombre: string;
  metodosPago: string[];
  onMesasLoaded?: (count: number, lista?: any[]) => void;
  onAgregarProductos?: (mesa: any) => void;
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

export default function MesasAbiertas({ terminal, meseroNombre, metodosPago, onMesasLoaded, onAgregarProductos }: Props) {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertasEnviadas, setAlertasEnviadas] = useState<AlertaEnviada[]>([]);
  const [enviandoAlerta, setEnviandoAlerta] = useState<string | null>(null);
  const [metodoPagoModal, setMetodoPagoModal] = useState<string | null>(null);

  // Estados para cancelación de ítems
  const [cancelarModal, setCancelarModal] = useState<{
    mesa: any;
    item: any;
    cantidad: number;
    motivo: string;
  } | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'ok' | 'err'; text: string } | null>(null);
  const [mesasExpandidas, setMesasExpandidas] = useState<Record<string, boolean>>({});

  const borderColorMesa = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 30) return 'border-emerald-500/40';
    if (diff < 60) return 'border-amber-500/40';
    return 'border-red-500/40';
  };

  const onMesasLoadedRef = useRef(onMesasLoaded);
  useEffect(() => { onMesasLoadedRef.current = onMesasLoaded; }, [onMesasLoaded]);

  const cargar = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await obtenerMesasAbiertas(terminal.sedeId);
      if (!Array.isArray(data)) {
        setMesas([]);
        return;
      }
      // Agrupar por id (o mesa_identificador si no tiene id) para no ocultar cuentas distintas
      const porMesa: Record<string, any> = {};
      for (const cmd of data) {
        const key = (cmd.id || cmd.mesa_identificador) as string;
        if (!porMesa[key] || new Date(cmd.created_at as string) > new Date(porMesa[key].created_at)) {
          porMesa[key] = cmd;
        }
      }
      const listaFinal = Object.values(porMesa).sort((a: any, b: any) =>
        String(a.mesa_identificador).localeCompare(String(b.mesa_identificador))
      );
      setMesas(listaFinal);
      onMesasLoadedRef.current?.(listaFinal.length, listaFinal);
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
      setFeedbackMsg({ tipo: 'ok', text: `Cajero notificado con ${metodo}.` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setEnviandoAlerta(null);
    }
  };

  const handleConfirmarCancelacion = async () => {
    if (!cancelarModal) return;
    setCancelando(true);
    try {
      const prodId = cancelarModal.item.producto_id || cancelarModal.item.id || '';
      const prodNom = cancelarModal.item.nombre || cancelarModal.item.producto || '';
      const cant = cancelarModal.cantidad;
      const precio = Number(cancelarModal.item.precio_unitario || 0);
      const motivo = cancelarModal.motivo.trim() || 'Cancelado por mesero';

      const res = await cancelarItemMesa({
        terminalCode: terminal.terminalCode,
        mesaId: cancelarModal.mesa.id,
        mesaIdentificador: cancelarModal.mesa.mesa_identificador,
        productoId: prodId,
        nombreProducto: prodNom,
        cantidad: cant,
        precioUnitario: precio,
        motivo: motivo,
      });

      if (res.success) {
        setCancelarModal(null);
        setFeedbackMsg({
          tipo: 'ok',
          text: `Cancelado: ${cant}x ${prodNom}. Ticket enviado a cocina y registrado en auditoría.`,
        });
        setTimeout(() => setFeedbackMsg(null), 5000);
        cargar(true);
      } else {
        setFeedbackMsg({
          tipo: 'err',
          text: res.error || 'No se pudo cancelar el producto.',
        });
        setTimeout(() => setFeedbackMsg(null), 5000);
      }
    } catch {
      setFeedbackMsg({ tipo: 'err', text: 'Error inesperado al cancelar producto.' });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } finally {
      setCancelando(false);
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
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
            feedbackMsg.tipo === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedbackMsg.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

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
          const itemsRaw: any[] = Array.isArray(mesa.items) ? mesa.items : [];
          // Filtrar metadatos
          const itemsValidos = itemsRaw.filter((it: any) => it.tipo !== 'meta' && (it.nombre || it.producto));
          const total = Number(mesa.total) > 0 ? Number(mesa.total) : itemsValidos.reduce((s: number, i: any) =>
            s + (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0), 0
          );
          const alertaEnviada = alertaYaEnviada(mesa.mesa_identificador);
          const enviando = enviandoAlerta === mesa.mesa_identificador;
          const mesaKey = mesa.id || mesa.mesa_identificador;
          const expandida = Boolean(mesasExpandidas[mesaKey]);
          const itemsAMostrar = expandida ? itemsValidos : itemsValidos.slice(0, 5);

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

              {/* Lista de productos con botón de cancelación y auditoría */}
              {itemsValidos.length > 0 && (
                <div className="space-y-2 border-t border-neutral-800 pt-3">
                  {itemsAMostrar.map((item: any, i: number) => {
                    const cant = Number(item.cantidad) || 0;
                    const precio = Number(item.precio_unitario) || 0;
                    const subtotalUSD = cant * precio;
                    const tasaItem = Number(item.tasa_efectiva) || Number(mesa.tasa_efectiva) || 0;
                    const subtotalBs = item.total_bs ? Number(item.total_bs) : (tasaItem > 0 ? subtotalUSD * tasaItem : 0);
                    const prodNom = item.nombre || item.producto || 'Producto';

                    return (
                      <div key={i} className="flex justify-between items-start text-sm gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-neutral-300 text-xs sm:text-sm font-medium leading-snug break-words whitespace-normal flex items-start gap-1.5">
                            <span className="font-bold text-white shrink-0">{cant}x</span>
                            <span className="flex-1">{prodNom}</span>
                          </div>
                          {item.comentario && (
                            <p className="text-amber-400/90 text-xs mt-1 leading-snug break-words whitespace-pre-wrap bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                              📝 {item.comentario}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <span className="text-neutral-300 text-xs font-semibold">
                              ${subtotalUSD.toFixed(2)}
                            </span>
                            {subtotalBs > 0 && (
                              <span className="text-emerald-400 text-[11px] font-bold block">
                                Bs. {formatearBs(subtotalBs)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCancelarModal({
                                mesa,
                                item,
                                cantidad: cant,
                                motivo: 'Cliente canceló',
                              });
                            }}
                            title="Eliminar producto dejando registro"
                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {itemsValidos.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setMesasExpandidas(prev => ({
                        ...prev,
                        [mesaKey]: !expandida,
                      }))}
                      className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 font-medium pt-1 transition-colors"
                    >
                      {expandida ? (
                        <><ChevronUp size={13} /> Ver menos productos</>
                      ) : (
                        <><ChevronDown size={13} /> Ver {itemsValidos.length - 5} productos más</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Botones de acción: Agregar a la cuenta & Avisar cajero */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onAgregarProductos?.(mesa)}
                  className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 font-semibold py-3.5 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <PlusCircle size={15} className="text-indigo-400" />
                  Agregar a cuenta
                </button>

                {alertaEnviada ? (
                  <div className="flex items-center gap-1.5 text-green-400 text-xs justify-center py-3.5 bg-green-500/10 rounded-xl border border-green-500/20 font-medium">
                    <CheckCircle2 size={15} />
                    Cajero notificado
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMetodoPagoModal(mesa.mesa_identificador)}
                    disabled={enviando}
                    className="w-full bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/25 text-emerald-400 font-semibold py-3.5 rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    {enviando ? (
                      <><Loader2 size={15} className="animate-spin" /> Avisando...</>
                    ) : (
                      <><BellRing size={15} /> Avisar Cajero</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Modal de confirmación y auditoría de cancelación */}
      {cancelarModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
            onClick={() => !cancelando && setCancelarModal(null)}
          />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-6 pb-10 max-w-lg mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto mb-4" />

            <div className="flex items-center gap-2.5 text-red-400 mb-2">
              <AlertTriangle size={20} />
              <h3 className="text-white font-bold text-lg">Cancelar Producto de la Mesa</h3>
            </div>

            <p className="text-neutral-400 text-xs mb-4">
              {/^(mesa|orden|pedido|barra|terraza)/i.test(cancelarModal.mesa.mesa_identificador)
                ? cancelarModal.mesa.mesa_identificador
                : `Mesa ${cancelarModal.mesa.mesa_identificador}`}
              {' · '}<span className="text-white font-semibold">{cancelarModal.item.nombre || cancelarModal.item.producto}</span>
              {' · '}<span className="text-neutral-400">${Number(cancelarModal.item.precio_unitario || 0).toFixed(2)} c/u</span>
            </p>

            {/* Selector de cantidad si item.cantidad > 1 */}
            {Number(cancelarModal.item.cantidad || 1) > 1 && (
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 mb-4 flex items-center justify-between">
                <span className="text-neutral-400 text-xs font-medium">Cantidad a cancelar:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelarModal(prev => prev ? { ...prev, cantidad: Math.max(1, prev.cantidad - 1) } : null)}
                    disabled={cancelarModal.cantidad <= 1}
                    className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white font-bold flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span className="text-white font-black text-sm w-6 text-center">{cancelarModal.cantidad}</span>
                  <button
                    type="button"
                    onClick={() => setCancelarModal(prev => prev ? { ...prev, cantidad: Math.min(Number(prev.item.cantidad || 1), prev.cantidad + 1) } : null)}
                    disabled={cancelarModal.cantidad >= Number(cancelarModal.item.cantidad || 1)}
                    className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white font-bold flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Motivo de cancelación con chips rápidos */}
            <div className="mb-4 space-y-2">
              <label className="text-neutral-300 text-xs font-semibold block">
                Motivo de Cancelación <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Cliente canceló', 'Error de mesero', 'Agotado en cocina', 'Demora excesiva'].map(mot => (
                  <button
                    key={mot}
                    type="button"
                    onClick={() => setCancelarModal(prev => prev ? { ...prev, motivo: mot } : null)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                      cancelarModal.motivo === mot
                        ? 'bg-red-500/20 border-red-500/50 text-red-200'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {mot}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={cancelarModal.motivo}
                onChange={e => setCancelarModal(prev => prev ? { ...prev, motivo: e.target.value } : null)}
                placeholder="O escribe otro motivo específico..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50"
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5">
              <p className="text-amber-400/90 text-xs leading-relaxed">
                ⚠️ Se imprimirá un ticket de cancelación en cocina y quedará registrado en el historial de auditoría a tu nombre (<span className="text-amber-300 font-medium">{meseroNombre}</span>).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cancelando}
                onClick={() => setCancelarModal(null)}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-3 rounded-xl text-xs sm:text-sm transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={cancelando || !cancelarModal.motivo.trim()}
                onClick={handleConfirmarCancelacion}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
              >
                {cancelando ? (
                  <><Loader2 size={15} className="animate-spin" /> Cancelando...</>
                ) : (
                  <><Trash2 size={15} /> Confirmar Cancelación</>
                )}
              </button>
            </div>
          </div>
        </>
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

