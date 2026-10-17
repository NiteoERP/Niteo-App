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
  Layers,
  Coins
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
  { label: '🛵 Delivery Sede 1 y 2', prompt: '¿Cuánto vendimos por delivery este mes dividiendo sede 1 y sede 2?' },
  { label: '📈 Comparativa y Proyección', prompt: '¿Cómo van las ventas de este mes comparadas con el mes anterior y en cuánto proyectamos cerrar el mes?' },
  { label: '📅 Días y Horas Pico', prompt: '¿Qué día de la semana vendemos más este mes y cuáles son nuestras horas pico?' },
  { label: '💳 Todos los Métodos de Pago', prompt: 'Dame el resumen de ventas de todos los métodos de pago de este mes desglosado por sede.' },
  { label: '🧾 Cuentas por Cobrar', prompt: '¿Quiénes son los clientes que nos deben dinero y cuánto es el total por cobrar?' },
  { label: '🍽️ Rentabilidad del Menú', prompt: '¿Cuáles son los platos que más ganancia neta nos dejan este mes y cuáles tienen Food Cost alto?' },
  { label: '🎁 Cortesías y Mermas', prompt: '¿Cuánto hemos entregado en cortesías y cuánto hemos perdido en mermas este mes?' },
  { label: '👑 Clientes VIP', prompt: '¿Quiénes son nuestros 10 mejores clientes VIP por monto comprado y visitas?' },
  { label: '🔐 Cierres y Mesas en Vivo', prompt: '¿Cuántas mesas están abiertas ahora mismo en el POS y cómo estuvieron los cierres de caja de esta semana?' },
  { label: '📦 Estado de Inventario', prompt: '¿Cuánto vale mi inventario actual en dólares y qué insumos tienen stock bajo o agotado?' },
  { label: '🪄 Redondear a $0.50', prompt: 'Redondea todos los precios del catálogo al múltiplo de $0.50 más cercano.' },
  { label: '🎉 Crear Combo Fiesta', prompt: 'Hazme el combo fiesta que lleva 2 pizzas familiares tradicionales, 1 con maiz y un ref 2lt' },
  { label: '🍳 Receta y escandallo', prompt: 'Dime la receta de la Pizza Margarita y cuánto cuesta prepararla.' },
  { label: '💵 Tasa de hoy', prompt: '¿Cuál es la tasa oficial de hoy?' },
  { label: '⚠️ Auditar anulaciones y caja', prompt: 'Revisa si hubo facturas anuladas, devoluciones o descuentos aplicados en caja este mes.' },
];

/**
 * Renderizador de formato Markdown enriquecido para el chat de Copilot
 * Soporta tablas Markdown, encabezados (###), **negrita**, *cursiva*, `código`, > citas y - viñetas
 */
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let currentTableRows: string[][] = [];

  const parseInline = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
    const tokens = str.split(regex);

    tokens.forEach((token, i) => {
      if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
        parts.push(
          <strong key={i} className="font-bold text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
        parts.push(
          <code key={i} className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700/60 text-amber-300 font-mono text-[11px]">
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
        parts.push(
          <em key={i} className="italic text-neutral-300">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token) {
        parts.push(token);
      }
    });

    return parts;
  };

  const flushList = (keySuffix: string | number) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${keySuffix}`} className="my-1.5 pl-1 space-y-1">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  const flushTable = (keySuffix: string | number) => {
    if (currentTableRows.length > 0) {
      const header = currentTableRows[0];
      const body = currentTableRows.slice(1);
      elements.push(
        <div key={`table-${keySuffix}`} className="my-2 overflow-x-auto rounded-xl border border-neutral-700/70 bg-neutral-950/70">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-neutral-700/80 bg-neutral-900/90 text-indigo-300">
                {header.map((cell, cIdx) => (
                  <th key={cIdx} className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                    {parseInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/70">
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-neutral-800/40 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 text-neutral-200 whitespace-nowrap">
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTableRows = [];
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Detectar fila de tabla Markdown: | col1 | col2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      flushList(lineIdx);
      const rawCells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());
      // Ignorar fila separadora |---|---|
      const isSeparator = rawCells.every(c => /^[:\-]+$/.test(c));
      if (!isSeparator && rawCells.length > 0) {
        currentTableRows.push(rawCells);
      }
      return;
    } else {
      flushTable(lineIdx);
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2);
      currentList.push(
        <li key={`li-${lineIdx}`} className="flex items-start gap-1.5 my-0.5">
          <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
          <span>{parseInline(content)}</span>
        </li>
      );
      return;
    }

    flushList(lineIdx);

    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      const headingText = trimmed.replace(/^#{2,3}\s+/, '');
      elements.push(
        <h4 key={`h-${lineIdx}`} className="text-xs sm:text-sm font-bold text-indigo-300 mt-2.5 mb-1 tracking-tight">
          {parseInline(headingText)}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('> ')) {
      elements.push(
        <div key={`quote-${lineIdx}`} className="border-l-2 border-indigo-500/80 pl-2.5 my-1.5 text-neutral-300 italic bg-indigo-950/20 py-1 rounded-r-lg">
          {parseInline(trimmed.slice(2))}
        </div>
      );
      return;
    }

    if (!trimmed) {
      elements.push(<div key={`empty-${lineIdx}`} className="h-1.5" />);
      return;
    }

    elements.push(
      <p key={`p-${lineIdx}`} className="my-0.5 leading-relaxed">
        {parseInline(line)}
      </p>
    );
  });

  flushTable('final');
  flushList('final');

  return <div className="space-y-0.5">{elements}</div>;
}

export default function CopilotWidget({ activeSedeId }: { activeSedeId?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [inputTexto, setInputTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [ejecutandoAccion, setEjecutandoAccion] = useState<string | null>(null);

  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'init-1',
      rol: 'copilot',
      texto: '¡Hola! Soy **Niteo Copilot 360°**, tu Director Financiero y Asistente Operativo con **Matemática Dorada**.\n\nPuedo analizar al instante el 100% de tus **ventas por sede, delivery, días de la semana, horas pico, métodos de pago, cuentas por cobrar, rentabilidad del menú, clientes VIP, cortesías/mermas, cierres de caja y mesas abiertas**, además de crear combos, recetas y ajustar precios.',
      creadoEn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (abierto) {
      scrollToBottom();
      textareaRef.current?.focus();
    }
  }, [mensajes, abierto]);

  // Estado de posición flotante arrastrable
  const [posicion, setPosicion] = useState<{ x: number; y: number } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const dragInfoRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    moved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    moved: false
  });

  // Cargar posición guardada o colocar por defecto sobre la barra inferior
  useEffect(() => {
    const calcularPosicionInicial = () => {
      const isMobile = window.innerWidth < 640;
      const defaultX = window.innerWidth - (isMobile ? 60 : 72);
      // En móvil, 135px de margen inferior para no tapar la barra de navegación de 5 botones
      const defaultY = window.innerHeight - (isMobile ? 135 : 95);

      try {
        const guardada = localStorage.getItem('niteo_copilot_pos');
        if (guardada) {
          const parsed = JSON.parse(guardada);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            const clampX = Math.min(Math.max(parsed.x, 8), window.innerWidth - 56);
            const clampY = Math.min(Math.max(parsed.y, 60), window.innerHeight - 80);
            return { x: clampX, y: clampY };
          }
        }
      } catch {}

      return { x: defaultX, y: defaultY };
    };

    setPosicion(calcularPosicionInicial());

    const handleResize = () => {
      setPosicion(prev => {
        if (!prev) return null;
        const clampX = Math.min(Math.max(prev.x, 8), window.innerWidth - 56);
        const clampY = Math.min(Math.max(prev.y, 60), window.innerHeight - 80);
        return { x: clampX, y: clampY };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const iniciarArrastre = (clientX: number, clientY: number) => {
    if (!posicion) return;
    dragInfoRef.current = {
      startX: clientX,
      startY: clientY,
      initX: posicion.x,
      initY: posicion.y,
      moved: false
    };
    setArrastrando(true);
  };

  const moverArrastre = (clientX: number, clientY: number) => {
    if (!dragInfoRef.current) return;
    const deltaX = clientX - dragInfoRef.current.startX;
    const deltaY = clientY - dragInfoRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      dragInfoRef.current.moved = true;
    }

    const newX = Math.min(Math.max(dragInfoRef.current.initX + deltaX, 8), window.innerWidth - 56);
    const newY = Math.min(Math.max(dragInfoRef.current.initY + deltaY, 60), window.innerHeight - 80);

    setPosicion({ x: newX, y: newY });
  };

  const finalizarArrastre = () => {
    setArrastrando(false);
    if (!dragInfoRef.current.moved) {
      // Toque simple sin arrastre -> Desplegar Copilot
      setAbierto(true);
      return;
    }

    // Si se arrastró, imantar suavemente hacia el lateral más cercano (izquierdo o derecho)
    setPosicion(prev => {
      if (!prev) return null;
      const isMobile = window.innerWidth < 640;
      const margin = isMobile ? 12 : 20;
      const snapX = prev.x < window.innerWidth / 2 ? margin : window.innerWidth - (isMobile ? 58 : 68);
      const finalPos = { x: snapX, y: prev.y };
      try {
        localStorage.setItem('niteo_copilot_pos', JSON.stringify(finalPos));
      } catch {}
      return finalPos;
    });
  };

  // Eventos globales de mouse para arrastre fluido en desktop
  useEffect(() => {
    if (!arrastrando) return;

    const onMouseMove = (e: MouseEvent) => {
      moverArrastre(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      finalizarArrastre();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [arrastrando]);

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
      } else if (accion.tipo === 'actualizar_precio_combo') {
        payload = {
          comboId: accion.detalles?.comboId,
          productoId: accion.detalles?.productoId,
          nombreActual: accion.detalles?.nombreActual,
          nuevoNombre: accion.detalles?.nuevoNombre,
          nuevoPrecio: accion.detalles?.nuevoPrecio
        };
      } else if (accion.tipo === 'ajuste_masivo_precios') {
        payload = {
          items: accion.items || accion.detalles?.items || []
        };
      }

      const res = await ejecutarAccionCopilot({
        accion: accion.tipo as any,
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
      {/* Botón flotante estilo "Punto / Orb" Arrastrable */}
      {!abierto && (
        <div
          style={{
            position: 'fixed',
            left: posicion ? `${posicion.x}px` : 'auto',
            top: posicion ? `${posicion.y}px` : 'auto',
            right: posicion ? 'auto' : '1rem',
            bottom: posicion ? 'auto' : '8.5rem',
            zIndex: 50,
            touchAction: 'none'
          }}
          className="select-none"
        >
          <div className="relative group">
            {/* Resplandor suave de radar */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 opacity-60 blur-sm group-hover:opacity-100 transition duration-300 animate-pulse" />

            <button
              onMouseDown={e => {
                if (e.button === 0) {
                  iniciarArrastre(e.clientX, e.clientY);
                }
              }}
              onTouchStart={e => {
                const touch = e.touches[0];
                iniciarArrastre(touch.clientX, touch.clientY);
              }}
              onTouchMove={e => {
                const touch = e.touches[0];
                moverArrastre(touch.clientX, touch.clientY);
              }}
              onTouchEnd={() => {
                finalizarArrastre();
              }}
              className={`relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-indigo-500 text-white shadow-2xl shadow-indigo-500/40 border border-white/20 transition-transform duration-150 active:scale-95 cursor-grab touch-none ${
                arrastrando ? 'cursor-grabbing scale-110 shadow-indigo-500/70' : 'hover:scale-105'
              }`}
              aria-label="Abrir Niteo Copilot"
              title="Toca para abrir • Arrastra para mover por la pantalla"
            >
              {/* Radar status dot */}
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 ring-2 ring-neutral-950"></span>
              </span>

              <Sparkles className="w-5 h-5 text-white drop-shadow-md" />
            </button>

            {/* Tooltip sutil en desktop al pasar el mouse */}
            <div className="hidden sm:group-hover:block absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2.5 py-1 bg-neutral-900/95 border border-neutral-700 text-[11px] font-medium text-neutral-200 rounded-lg whitespace-nowrap shadow-xl pointer-events-none backdrop-blur-md">
              Niteo Copilot <span className="text-neutral-500 text-[10px]">(Arrastra para mover)</span>
            </div>
          </div>
        </div>
      )}

      {/* Ventana de Chat flotante */}
      {abierto && (
        <div
          className="fixed z-50 flex flex-col bg-neutral-900/95 backdrop-blur-xl border border-neutral-800/90 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(99,102,241,0.18)] overflow-hidden transition-all duration-300 inset-x-2 bottom-2 top-14 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 sm:w-[500px] sm:h-[670px] sm:max-h-[88vh]"
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
                onClick={() => setAbierto(false)}
                className="p-1.5 hover:text-neutral-200 hover:bg-neutral-800/80 rounded-xl transition"
                title="Minimizar a punto flotante"
              >
                <Minimize2 size={16} />
              </button>
              <button
                onClick={() => setAbierto(false)}
                className="p-1.5 hover:text-rose-400 hover:bg-neutral-800/80 rounded-xl transition"
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

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
                    className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words ${
                      esUsuario
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white rounded-br-sm shadow-md shadow-indigo-950/40 border border-indigo-400/20'
                        : 'bg-neutral-800/90 backdrop-blur-sm text-neutral-100 border border-neutral-700/60 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <FormattedMessage text={m.texto} />
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
                        {m.accionPropuesta.tipo === 'actualizar_precio_combo' && <Tag size={15} />}
                        {m.accionPropuesta.tipo === 'ajuste_masivo_precios' && <Coins size={15} />}
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

                          {m.accionPropuesta.tipo === 'actualizar_precio_combo' && (
                            <div className="text-[11px] space-y-2 text-neutral-300">
                              <p>Producto / Promoción: <strong className="text-white font-semibold">{m.accionPropuesta.detalles?.nombreActual}</strong></p>
                              {m.accionPropuesta.detalles?.nuevoNombre && m.accionPropuesta.detalles?.nuevoNombre !== m.accionPropuesta.detalles?.nombreActual && (
                                <p className="text-[10px] text-indigo-300">Nuevo nombre: <strong className="text-white">{m.accionPropuesta.detalles?.nuevoNombre}</strong></p>
                              )}
                              <div className="flex items-center gap-4 p-2.5 bg-neutral-900/90 rounded-xl border border-neutral-800">
                                <div>
                                  <span className="block text-[10px] text-neutral-400 uppercase tracking-wider">Precio Actual</span>
                                  <span className="text-xs line-through text-neutral-400 font-mono font-medium">${Number(m.accionPropuesta.detalles?.precioAnterior || 0).toFixed(2)} USD</span>
                                </div>
                                <ArrowRightLeft size={14} className="text-indigo-400 shrink-0" />
                                <div>
                                  <span className="block text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Nuevo Precio</span>
                                  <span className="text-sm font-bold text-emerald-400 font-mono">${Number(m.accionPropuesta.detalles?.nuevoPrecio || 0).toFixed(2)} USD</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {m.accionPropuesta.tipo === 'ajuste_masivo_precios' && (
                            <div className="text-[11px] space-y-2 text-neutral-300">
                              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                                <span>Criterio: <strong className="text-white">{m.accionPropuesta.detalles?.descripcionCriterio || 'Ajuste de Precios'}</strong></span>
                                <span className="bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800 text-[10px] font-semibold">
                                  {m.accionPropuesta.detalles?.totalAfectados || m.accionPropuesta.items?.length || 0} ítems
                                </span>
                              </div>

                              {/* Vista previa scrollable de productos y combos */}
                              <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-neutral-900/90 rounded-xl border border-neutral-800 divide-y divide-neutral-800/60 custom-scrollbar">
                                {(m.accionPropuesta.items || m.accionPropuesta.detalles?.items || []).map((it: any, idx: number) => {
                                  const diff = Number(it.diferencia_usd || 0);
                                  return (
                                    <div key={idx} className="flex items-center justify-between pt-1.5 first:pt-0 gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-white font-medium text-[11px]">{it.nombre}</p>
                                        <div className="flex items-center gap-1.5 text-[9px] text-neutral-500">
                                          <span className="capitalize">{it.tipo === 'combo' ? 'Combo / Promo' : (it.categoria || 'Producto')}</span>
                                          {it.nuevo_nombre && it.nuevo_nombre !== it.nombre && (
                                            <span className="text-indigo-400 truncate">➔ {it.nuevo_nombre}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                                        <span className="line-through text-neutral-500">${Number(it.precio_anterior).toFixed(2)}</span>
                                        <span className="text-neutral-500">➔</span>
                                        <span className="text-emerald-400 font-bold">${Number(it.nuevo_precio).toFixed(2)}</span>
                                        <span className={`text-[10px] px-1 py-0.2 rounded font-medium ${diff >= 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-red-950/80 text-red-400 border border-red-800/50'}`}>
                                          {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {m.accionPropuesta.detalles?.cambioPromedioUsd !== undefined && (
                                <div className="flex justify-between items-center text-[10px] text-neutral-400 px-1 pt-0.5">
                                  <span>Variación promedio: <strong className={Number(m.accionPropuesta.detalles.cambioPromedioUsd) >= 0 ? 'text-emerald-400' : 'text-amber-400'}>{Number(m.accionPropuesta.detalles.cambioPromedioUsd) >= 0 ? '+' : ''}${Number(m.accionPropuesta.detalles.cambioPromedioUsd).toFixed(2)} USD</strong></span>
                                  <span>Prods: {m.accionPropuesta.detalles.totalProductos || 0} | Combos: {m.accionPropuesta.detalles.totalCombos || 0}</span>
                                </div>
                              )}
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
                                     m.accionPropuesta.tipo === 'actualizar_precio_combo' ? 'Confirmar y Actualizar Precio' :
                                     m.accionPropuesta.tipo === 'ajuste_masivo_precios' ? `Confirmar y Actualizar ${m.accionPropuesta.detalles?.totalAfectados || m.accionPropuesta.items?.length || ''} Precios` :
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
        </div>
      )}
    </>
  );
}
