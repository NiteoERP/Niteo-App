'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Bot, 
  Send, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  RotateCcw,
  Minimize2,
  Maximize2,
  Truck,
  Combine,
  Tag,
  Receipt
} from 'lucide-react';
import { enviarMensajeCopilot, ejecutarAccionCopilot, CopilotRespuesta } from '@/actions/copilot-actions';

interface MensajeChat {
  id: string;
  rol: 'usuario' | 'copilot';
  texto: string;
  accionPropuesta?: CopilotRespuesta['accionPropuesta'];
  accionEjecutada?: boolean;
  creadoEn: string;
}

const SUGERENCIAS_RAPIDAS = [
  { label: '💵 Tasa de hoy', prompt: '¿Cuál es la tasa oficial de hoy?' },
  { label: '🌙 Cenas y compras de hoy', prompt: 'Dime las ventas de las cenas y las compras de hoy tanto en dólares como en bolívares.' },
  { label: '📱 Pago Móvil por sedes', prompt: '¿Cuáles fueron las ventas en Pago Móvil en las 2 sedes hoy?' },
  { label: '🏆 Más vendidos esta semana', prompt: '¿Cuáles han sido los productos más vendidos esta semana?' },
  { label: '🧀 Consumo de mozzarella', prompt: '¿Cuánto queso mozzarella se ha consumido y a cuántas barras equivale si una barra pesa 3kg?' },
  { label: '🏷️ Fusionar marcas', prompt: 'Quiero fusionar las marcas de Harina de Maíz para que Harina PAN quede como palabra clave.' },
  { label: '🚚 Registrar despacho', prompt: 'Quiero hacer un despacho de la Sede Principal a la Sede Norte con 10kg de queso mozzarella.' },
  { label: '🤝 Venta al costo', prompt: 'Quiero hacer una venta al costo para Juan Pérez de 5 cajas de refresco.' },
  { label: '⚠️ Auditar compras sospechosas', prompt: 'Verifica si en las compras de los últimos 30 días hay compras del mismo día con montos casi iguales.' },
  { label: '📦 Combos inactivos (6 meses)', prompt: 'Revisa todos los combos que no se han utilizado en los últimos 6 meses para evaluar desactivarlos.' },
];

export default function CopilotWidget({ activeSedeId }: { activeSedeId?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [inputTexto, setInputTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [ejecutandoAccion, setEjecutandoAccion] = useState<string | null>(null);

  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'init-1',
      rol: 'copilot',
      texto: '¡Hola! Soy **Niteo Copilot**, tu asistente inteligente con conexión directa a ventas, inventario, tasas cambiarias, auditoría y catálogo.\n\nPuedes consultarme la tasa oficial de cualquier fecha, el balance de ventas/cenas y compras en USD y Bs, cobros en Pago Móvil por sede, o solicitarme traslados entre sedes, fusiones de marcas y ventas al costo.',
      creadoEn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (abierto && !minimizado) {
      scrollToBottom();
      textareaRef.current?.focus();
    }
  }, [mensajes, abierto, minimizado]);

  const handleReiniciarChat = () => {
    setMensajes([
      {
        id: `init-${Date.now()}`,
        rol: 'copilot',
        texto: '🔄 **Contexto reiniciado.** Memoria liberada. ¿Qué otra consulta u operación deseas realizar?',
        creadoEn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleEnviar = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputTexto).trim();
    if (!texto || cargando) return;

    const idUsuario = `u-${Date.now()}`;
    const idRespuesta = `c-${Date.now()}`;
    const ahora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const nuevoMensajeUsuario: MensajeChat = {
      id: idUsuario,
      rol: 'usuario',
      texto,
      creadoEn: ahora
    };

    setMensajes(prev => [...prev, nuevoMensajeUsuario]);
    setInputTexto('');
    setCargando(true);

    // OPTIMIZACIÓN DE TOKENS Y LATENCIA (Sliding Window):
    // Conservamos únicamente los últimos 6 mensajes (3 turnos completos usuario-modelo).
    // Esto ahorra hasta un 85% de tokens y evita sobrecargar la ventana de inferencia de Gemini.
    const historial = mensajes
      .filter(m => !m.id.startsWith('init-'))
      .slice(-6)
      .map(m => ({
        role: (m.rol === 'usuario' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.texto }]
      }));

    try {
      const res = await enviarMensajeCopilot({
        mensaje: texto,
        historial,
        activeSedeId
      });

      const nuevoMensajeCopilot: MensajeChat = {
        id: idRespuesta,
        rol: 'copilot',
        texto: res.texto,
        accionPropuesta: res.accionPropuesta,
        creadoEn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMensajes(prev => [...prev, nuevoMensajeCopilot]);
    } catch (err: any) {
      setMensajes(prev => [
        ...prev,
        {
          id: idRespuesta,
          rol: 'copilot',
          texto: 'Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.',
          creadoEn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleEjecutarAccion = async (msgId: string, accion: CopilotRespuesta['accionPropuesta']) => {
    if (!accion) return;

    setEjecutandoAccion(msgId);
    try {
      let payload: any = {};

      if (accion.tipo === 'desactivar_combos') {
        payload = { combo_ids: accion.items?.map(i => i.id) || [] };
      } else if (accion.tipo === 'fusionar_insumos') {
        payload = {
          masterId: accion.detalles?.masterId,
          slaveIds: accion.detalles?.slaveIds
        };
      } else if (accion.tipo === 'ejecutar_despacho') {
        payload = {
          origenId: accion.detalles?.origenId,
          destinoId: accion.detalles?.destinoId,
          items: accion.detalles?.items,
          notas: accion.detalles?.notas
        };
      } else if (accion.tipo === 'ejecutar_venta_costo') {
        payload = {
          beneficiario: accion.detalles?.beneficiario,
          items: accion.detalles?.items,
          notas: accion.detalles?.notas
        };
      }

      const res = await ejecutarAccionCopilot({
        accion: accion.tipo,
        payload,
        activeSedeId
      });

      if (res.success) {
        setMensajes(prev =>
          prev.map(m =>
            m.id === msgId
              ? {
                  ...m,
                  accionEjecutada: true,
                  texto: `${m.texto}\n\n> ✅ **Acción completada con éxito:** ${res.mensaje}`
                }
              : m
          )
        );
      } else {
        alert(`Error al ejecutar: ${res.mensaje}`);
      }
    } catch (err: any) {
      alert(`Error inesperado: ${err.message}`);
    } finally {
      setEjecutandoAccion(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  return (
    <>
      {/* Botón flotante siempre visible en dashboard */}
      <div className="fixed bottom-6 right-6 z-50">
        {!abierto && (
          <button
            onClick={() => setAbierto(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/30 transition-all duration-300 hover:scale-105 active:scale-95 border border-indigo-400/30"
            aria-label="Abrir Niteo Copilot"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <Sparkles className="w-5 h-5 text-purple-200 animate-pulse" />
            <span className="font-semibold text-sm tracking-wide pr-1">Niteo Copilot</span>
          </button>
        )}
      </div>

      {/* Ventana de Chat flotante */}
      {abierto && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
            minimizado 
              ? 'w-80 h-16' 
              : 'w-[94vw] sm:w-[500px] h-[660px] max-h-[88vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-neutral-950 border-b border-neutral-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles size={17} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-neutral-100">Niteo Copilot</h3>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-mono">
                    Gemini AI
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">Inteligencia de Datos y Operaciones</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-neutral-400">
              <button
                onClick={handleReiniciarChat}
                className="p-1.5 hover:text-amber-300 hover:bg-neutral-800 rounded-lg transition"
                title="Reiniciar conversación y liberar memoria"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setMinimizado(!minimizado)}
                className="p-1.5 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
                title={minimizado ? 'Maximizar' : 'Minimizar'}
              >
                {minimizado ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={() => setAbierto(false)}
                className="p-1.5 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!minimizado && (
            <>
              {/* Sugerencias rápidas (chips) */}
              <div className="px-3 py-2 bg-neutral-950/70 border-b border-neutral-800/50 overflow-x-auto scrollbar-none flex items-center gap-1.5">
                {SUGERENCIAS_RAPIDAS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleEnviar(sug.prompt)}
                    disabled={cargando}
                    className="flex-shrink-0 text-[11px] bg-neutral-800/80 hover:bg-indigo-950 hover:text-indigo-200 hover:border-indigo-700/50 text-neutral-300 border border-neutral-700/50 px-2.5 py-1 rounded-full transition whitespace-nowrap active:scale-95 disabled:opacity-50"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>

              {/* Mensajes del Chat */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm text-neutral-200">
                {mensajes.map(m => {
                  const esUsuario = m.rol === 'usuario';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${esUsuario ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] text-neutral-500">{m.creadoEn}</span>
                      </div>

                      <div
                        className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          esUsuario
                            ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                            : 'bg-neutral-800/95 text-neutral-200 border border-neutral-700/60 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {m.texto}
                      </div>

                      {/* Tarjeta de Acción Interactiva con Confirmación Humana */}
                      {m.accionPropuesta && !m.accionEjecutada && (
                        <div className="mt-2.5 max-w-[92%] p-3.5 bg-neutral-950 border border-amber-500/50 rounded-xl space-y-2.5 shadow-lg">
                          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                            {m.accionPropuesta.tipo === 'ejecutar_despacho' && <Truck size={15} />}
                            {m.accionPropuesta.tipo === 'fusionar_insumos' && <Combine size={15} />}
                            {m.accionPropuesta.tipo === 'ejecutar_venta_costo' && <Receipt size={15} />}
                            {m.accionPropuesta.tipo === 'desactivar_combos' && <AlertTriangle size={15} />}
                            <span>{m.accionPropuesta.titulo}</span>
                          </div>

                          {/* Vista previa según el tipo de acción */}
                          {m.accionPropuesta.tipo === 'desactivar_combos' && (
                            <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-neutral-300">
                              {m.accionPropuesta.items?.map((it, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                  <span className="font-medium text-neutral-200">{it.nombre}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {m.accionPropuesta.tipo === 'fusionar_insumos' && (
                            <div className="text-[11px] space-y-1 text-neutral-300">
                              <p>Consolidará en: <strong className="text-white">{m.accionPropuesta.detalles?.masterNombre}</strong></p>
                              <p>Stock resultante: <strong className="text-emerald-400">{m.accionPropuesta.detalles?.stockTotal} {m.accionPropuesta.detalles?.unidadMedida}</strong></p>
                              <p className="text-[10px] text-neutral-400">Palabras clave añadidas: {m.accionPropuesta.detalles?.keywords?.slice(0, 4).join(', ')}...</p>
                            </div>
                          )}

                          {m.accionPropuesta.tipo === 'ejecutar_despacho' && (
                            <div className="text-[11px] space-y-1 text-neutral-300">
                              <p>Origen: <strong className="text-white">{m.accionPropuesta.detalles?.origenNombre}</strong></p>
                              <p>Destino: <strong className="text-white">{m.accionPropuesta.detalles?.destinoNombre}</strong></p>
                              <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                                {m.accionPropuesta.detalles?.items?.map((it: any, idx: number) => (
                                  <div key={idx} className="flex justify-between border-t border-neutral-800 pt-0.5">
                                    <span>{it.nombre}</span>
                                    <span className="font-mono text-emerald-400 font-semibold">{it.cantidad} {it.unidad_medida}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {m.accionPropuesta.tipo === 'ejecutar_venta_costo' && (
                            <div className="text-[11px] space-y-1 text-neutral-300">
                              <p>Beneficiario: <strong className="text-white">{m.accionPropuesta.detalles?.beneficiario}</strong></p>
                              <p>Total al Costo: <strong className="text-emerald-400">${m.accionPropuesta.detalles?.costoTotalUsd} USD</strong> ({m.accionPropuesta.detalles?.costoTotalBs} Bs)</p>
                            </div>
                          )}

                          <div className="pt-2 flex items-center gap-2">
                            <button
                              onClick={() => handleEjecutarAccion(m.id, m.accionPropuesta)}
                              disabled={ejecutandoAccion === m.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                            >
                              {ejecutandoAccion === m.id ? (
                                <>
                                  <RefreshCw size={12} className="animate-spin" />
                                  <span>Procesando...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>Confirmar y Ejecutar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Indicador de carga */}
                {cargando && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-400 flex-shrink-0 animate-pulse">
                      <Bot size={15} />
                    </div>
                    <div className="p-3 bg-neutral-800/80 border border-neutral-700/50 rounded-2xl rounded-bl-none text-xs text-neutral-400 flex items-center gap-2">
                      <RefreshCw size={13} className="animate-spin text-purple-400" />
                      <span>Consultando datos y preparando respuesta con Gemini...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-neutral-950 border-t border-neutral-800/80">
                <div className="flex items-end gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 focus-within:border-indigo-500/80 transition">
                  <textarea
                    ref={textareaRef}
                    value={inputTexto}
                    onChange={e => setInputTexto(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pregúntale a Copilot sobre tasas, ventas, sedes, despachos..."
                    rows={1}
                    className="flex-1 bg-transparent border-0 resize-none text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none max-h-24 overflow-y-auto"
                  />
                  <button
                    onClick={() => handleEnviar()}
                    disabled={!inputTexto.trim() || cargando}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition disabled:opacity-40 disabled:hover:bg-indigo-600 flex-shrink-0"
                    title="Enviar mensaje"
                  >
                    <Send size={15} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-neutral-500">
                  <span>Enter para enviar • Shift+Enter para salto de línea</span>
                  <span>Protegido por permisos y RLS</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
