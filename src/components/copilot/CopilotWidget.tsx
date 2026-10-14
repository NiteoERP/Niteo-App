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
  Receipt,
  ArrowRightLeft,
  Utensils,
  Layers
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
  { label: '🎉 Crear Combo Fiesta', prompt: 'Hazme el combo fiesta que lleva 2 pizzas familiares tradicionales, 1 con maiz y un ref 2lt' },
  { label: '🍳 Receta y escandallo', prompt: 'Dime la receta de la Pizza Margarita y cuánto cuesta prepararla.' },
  { label: '📝 Crear / Armar receta', prompt: 'Quiero armar la receta para la Pizza Margarita: 250g de masa de pizza, 120g de queso mozzarella y 60g de salsa de tomate.' },
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

  // Ajuste dinámico de altura del textarea para evitar recortes de texto y scrollbars molestos
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      const calculatedHeight = Math.min(Math.max(scrollH, 36), 120);
      textareaRef.current.style.height = `${calculatedHeight}px`;
    }
  }, [inputTexto]);

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
      } else if (accion.tipo === 'agrupar_similares') {
        payload = {
          grupo: accion.detalles?.grupo,
          productoIds: accion.detalles?.productoIds
        };
      } else if (accion.tipo === 'guardar_receta') {
        payload = {
          productoId: accion.detalles?.productoId,
          items: accion.detalles?.items,
          costoTotal: accion.detalles?.costoTotal,
          modo: accion.detalles?.modo
        };
      } else if (accion.tipo === 'crear_combo') {
        payload = {
          nombre: accion.detalles?.nombre,
          descripcion: accion.detalles?.descripcion,
          tipo: accion.detalles?.tipo,
          regla_precio: accion.detalles?.regla_precio,
          precio_fijo: accion.detalles?.precio_fijo,
          config_seleccion: accion.detalles?.config_seleccion
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
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-neutral-900/95 backdrop-blur-xl border border-neutral-800/90 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(99,102,241,0.18)] overflow-hidden transition-all duration-300 ${
            minimizado 
              ? 'w-80 h-16' 
              : 'w-[94vw] sm:w-[500px] h-[670px] max-h-[88vh]'
          }`}
        >
          {/* Subtle Top Glowing Line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-neutral-100 tracking-tight">Niteo Copilot</h3>
                  <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Gemini AI
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-normal">Inteligencia de Datos y Operaciones</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-neutral-400">
              <button
                onClick={handleReiniciarChat}
                className="p-1.5 hover:text-amber-300 hover:bg-neutral-800/80 rounded-xl transition"
                title="Reiniciar conversación y liberar memoria"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setMinimizado(!minimizado)}
                className="p-1.5 hover:text-neutral-200 hover:bg-neutral-800/80 rounded-xl transition"
                title={minimizado ? 'Maximizar' : 'Minimizar'}
              >
                {minimizado ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={() => setAbierto(false)}
                className="p-1.5 hover:text-neutral-200 hover:bg-neutral-800/80 rounded-xl transition"
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
                    className="flex-shrink-0 text-[11px] bg-neutral-900/90 hover:bg-indigo-950/60 hover:text-indigo-200 hover:border-indigo-500/50 text-neutral-300 border border-neutral-800 px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap active:scale-95 disabled:opacity-50 shadow-sm"
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
                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white rounded-br-sm shadow-md shadow-indigo-950/40 border border-indigo-400/20'
                            : 'bg-neutral-800/90 backdrop-blur-sm text-neutral-100 border border-neutral-700/60 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {m.texto}
                      </div>

                      {/* Tarjeta de Acción Interactiva con Confirmación Humana */}
                      {m.accionPropuesta && !m.accionEjecutada && (
                        <div className="mt-3 max-w-[95%] p-4 bg-gradient-to-b from-neutral-950/95 to-neutral-900/95 border border-amber-500/40 rounded-2xl space-y-3 shadow-xl shadow-black/60 backdrop-blur-md">
                          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                            {m.accionPropuesta.tipo === 'ejecutar_despacho' && <Truck size={15} />}
                            {m.accionPropuesta.tipo === 'fusionar_insumos' && <Combine size={15} />}
                            {m.accionPropuesta.tipo === 'ejecutar_venta_costo' && <Receipt size={15} />}
                            {m.accionPropuesta.tipo === 'desactivar_combos' && <AlertTriangle size={15} />}
                            {m.accionPropuesta.tipo === 'agrupar_similares' && <ArrowRightLeft size={15} />}
                            {m.accionPropuesta.tipo === 'guardar_receta' && <Utensils size={15} />}
                            {m.accionPropuesta.tipo === 'crear_combo' && <Layers size={15} />}
                            <span>{m.accionPropuesta.titulo}</span>
                          </div>

                          {/* Vista previa según el tipo de acción */}
                          {m.accionPropuesta.tipo === 'crear_combo' && (
                            <div className="text-[11px] space-y-1.5 text-neutral-300">
                              <p>Combo: <strong className="text-white">{m.accionPropuesta.detalles?.nombre}</strong></p>
                              <div className="max-h-28 overflow-y-auto space-y-1 pt-1">
                                {m.accionPropuesta.detalles?.items?.map((it: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center border-t border-neutral-800/80 pt-0.5">
                                    <span className="truncate pr-2">{it.cantidad}x {it.nombre}</span>
                                    <span className="font-mono text-indigo-300 shrink-0 font-medium">
                                      ${Number(it.subtotal).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-neutral-800 text-[11px]">
                                <div>
                                  <span>Precio Combo: <strong className="text-emerald-400 font-mono text-xs">${m.accionPropuesta.detalles?.precio_fijo} USD</strong></span>
                                  {m.accionPropuesta.detalles?.ahorro_usd > 0 && (
                                    <span className="ml-1.5 text-neutral-400 text-[10px]">(Ahorro ${m.accionPropuesta.detalles?.ahorro_usd} / {m.accionPropuesta.detalles?.ahorro_pct}%)</span>
                                  )}
                                </div>
                                {m.accionPropuesta.detalles?.precio_lista_total > 0 && (
                                  <span className="text-neutral-400 text-[10px] line-through">${m.accionPropuesta.detalles?.precio_lista_total}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {m.accionPropuesta.tipo === 'guardar_receta' && (
                            <div className="text-[11px] space-y-1.5 text-neutral-300">
                              <p>Producto: <strong className="text-white">{m.accionPropuesta.detalles?.productoNombre}</strong></p>
                              <div className="max-h-28 overflow-y-auto space-y-1 pt-1">
                                {m.accionPropuesta.detalles?.items?.map((it: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center border-t border-neutral-800/80 pt-0.5">
                                    <span className="truncate pr-2">{it.nombre}</span>
                                    <span className="font-mono text-indigo-300 shrink-0 font-medium">
                                      {it.cantidad} {it.unidad_medida} (${it.subtotal !== undefined ? it.subtotal : (it.cantidad * (it.costo_unitario || 0)).toFixed(2)})
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-neutral-800 text-[11px]">
                                <span>Costo Elaboración: <strong className="text-emerald-400 font-mono">${m.accionPropuesta.detalles?.costoTotal} USD</strong></span>
                                {m.accionPropuesta.detalles?.precioVenta > 0 && (
                                  <span>P. Venta: <strong className="text-white font-mono">${m.accionPropuesta.detalles?.precioVenta} USD</strong></span>
                                )}
                              </div>
                            </div>
                          )}

                          {m.accionPropuesta.tipo === 'agrupar_similares' && (
                            <div className="text-[11px] space-y-1.5 text-neutral-300">
                              <p>Grupo / Principio Activo: <strong className="text-indigo-400 font-semibold">{m.accionPropuesta.detalles?.grupo}</strong></p>
                              <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                                {m.accionPropuesta.detalles?.productos?.map((it: any, idx: number) => (
                                  <div key={idx} className="flex justify-between border-t border-neutral-800 pt-0.5">
                                    <span className="truncate pr-2">{it.nombre}</span>
                                    <span className="font-mono text-emerald-400 shrink-0 font-semibold">${Number(it.precio_venta).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

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
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                            >
                              {ejecutandoAccion === m.id ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" />
                                  <span>Procesando...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} className="stroke-[2.5]" />
                                  <span>
                                    {m.accionPropuesta.tipo === 'guardar_receta' ? 'Guardar Receta en Catálogo' :
                                     m.accionPropuesta.tipo === 'crear_combo' ? 'Confirmar y Crear Combo' :
                                     'Confirmar y Ejecutar'}
                                  </span>
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
                    <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400 flex-shrink-0 shadow-md shadow-indigo-950 animate-pulse">
                      <Bot size={16} />
                    </div>
                    <div className="p-3 bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50 rounded-2xl rounded-bl-sm text-xs text-neutral-300 flex items-center gap-2 shadow-sm">
                      <RefreshCw size={13} className="animate-spin text-indigo-400" />
                      <span>Consultando datos y preparando respuesta con Gemini...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3.5 bg-neutral-950/90 backdrop-blur-md border-t border-neutral-800/70">
                <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 rounded-2xl px-3.5 py-2 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">
                  <textarea
                    ref={textareaRef}
                    value={inputTexto}
                    onChange={e => setInputTexto(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pregúntale a Copilot sobre tasas, ventas, sedes, recetas, combos..."
                    rows={1}
                    className="flex-1 bg-transparent border-0 resize-none text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none min-h-[36px] max-h-28 py-2 px-1 leading-relaxed overflow-y-auto hide-scrollbar"
                    style={{ height: '36px' }}
                  />
                  <button
                    onClick={() => handleEnviar()}
                    disabled={!inputTexto.trim() || cargando}
                    className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:hover:from-indigo-600 disabled:hover:to-purple-600 flex-shrink-0 cursor-pointer self-end mb-0.5"
                    title="Enviar mensaje"
                  >
                    <Send size={15} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-neutral-500">
                  <span>Enter para enviar • Shift+Enter para salto de línea</span>
                  <span className="flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Seguridad RLS & Roles
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
