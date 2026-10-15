'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Minus, Send, MessageSquare, Loader2, CheckCircle2, RefreshCw, ShoppingCart, X, Trash2, User, UserCheck, Search, Hash, ChevronRight, Printer, TableProperties, Sparkles } from 'lucide-react';
import { obtenerCatalogoMesa, obtenerTasaMesa, enviarComanda, buscarClientePorCedula, buscarClientesMesa, type ItemComanda, type ClienteSugeridoMesa } from '@/actions/mesas-actions';
import type { TerminalVinculado } from './MesasHub';
import PromoCocktailModal from './PromoCocktailModal';

interface CartItem extends ItemComanda {
  key: string;
  notas_preparacion?: string[];
}

const COMENTARIOS_RAPIDOS = ['Comer aquí', 'Para llevar'];

function formatearBs(montoBs: number): string {
  if (isNaN(montoBs) || montoBs < 0) return '0,00';
  return montoBs.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const extraerNotasPreparacion = (prod: any): string[] => {
  if (!prod?.notas_preparacion) return [];
  if (Array.isArray(prod.notas_preparacion)) {
    return prod.notas_preparacion.map((n: any) => String(n).trim()).filter(Boolean);
  }
  if (typeof prod.notas_preparacion === 'string') {
    try {
      const parsed = JSON.parse(prod.notas_preparacion);
      if (Array.isArray(parsed)) return parsed.map((n: any) => String(n).trim()).filter(Boolean);
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
    } catch {
      return prod.notas_preparacion.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

interface Props {
  terminal: TerminalVinculado;
  meseroNombre: string;
  mesaPreseleccionada?: {
    identificador: string;
    nombreCliente?: string;
    totalActual?: number;
  } | null;
  mesasAbiertas?: any[];
  onLimpiarMesaPreseleccionada?: () => void;
  onSeleccionarMesaAbierta?: (mesa: any) => void;
}

export default function NuevaComanda({
  terminal,
  meseroNombre,
  mesaPreseleccionada,
  mesasAbiertas,
  onLimpiarMesaPreseleccionada,
  onSeleccionarMesaAbierta,
}: Props) {
  const [tasaEfectiva, setTasaEfectiva] = useState<number>(terminal.tasa || 1);
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [catActiva, setCatActiva] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mesa, setMesa] = useState('');
  const [modalPromoAbierto, setModalPromoAbierto] = useState(false);
  const [promoSeleccionada, setPromoSeleccionada] = useState<any>(null);

  // Sincronizar mesa cuando viene preseleccionada desde Mesas Abiertas
  useEffect(() => {
    if (mesaPreseleccionada?.identificador) {
      setMesa(mesaPreseleccionada.identificador);
      if (mesaPreseleccionada.nombreCliente) {
        setClienteNombre(mesaPreseleccionada.nombreCliente);
      }
    }
  }, [mesaPreseleccionada]);

  const [clienteId, setClienteId] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteCedula, setClienteCedula] = useState('');
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [sugerenciasClientes, setSugerenciasClientes] = useState<ClienteSugeridoMesa[]>([]);
  const [mostrarDropdownClientes, setMostrarDropdownClientes] = useState(false);
  const debounceClienteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheClientesRef = useRef<Map<string, ClienteSugeridoMesa[]>>(new Map());

  const dispararBusquedaClientes = (termino: string, esCedula = false) => {
    if (debounceClienteRef.current) clearTimeout(debounceClienteRef.current);
    const trimmed = termino.trim();
    if (trimmed.length < 2) {
      setSugerenciasClientes([]);
      setMostrarDropdownClientes(false);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    if (cacheClientesRef.current.has(cacheKey)) {
      const cached = cacheClientesRef.current.get(cacheKey)!;
      setSugerenciasClientes(cached);
      setMostrarDropdownClientes(cached.length > 0);
      return;
    }

    debounceClienteRef.current = setTimeout(async () => {
      setBuscandoCliente(true);
      try {
        const resultados = await buscarClientesMesa(trimmed);
        cacheClientesRef.current.set(cacheKey, resultados || []);
        setSugerenciasClientes(resultados || []);
        setMostrarDropdownClientes((resultados && resultados.length > 0) || false);

        // Si escribió una cédula de 5+ dígitos y hay coincidencia, autocompletar clienteId, nombre y teléfono
        if (esCedula && trimmed.length >= 5 && resultados && resultados.length >= 1) {
          const soloNumInput = trimmed.replace(/[^0-9]/g, '');
          const match = resultados.find(u => {
            const soloNumDb = (u.rif_cedula || '').trim().replace(/[^0-9]/g, '');
            return soloNumDb && soloNumDb === soloNumInput;
          }) || (resultados.length === 1 ? resultados[0] : null);

          if (match && (!clienteNombre.trim() || !clienteId)) {
            setClienteId(match.id);
            if (!clienteNombre.trim()) setClienteNombre(match.nombre);
            if (match.telefono && !clienteTelefono.trim()) setClienteTelefono(match.telefono);
          }
        }
      } catch {
        // Ignorar errores de red momentáneos
      } finally {
        setBuscandoCliente(false);
      }
    }, 300);
  };

  const seleccionarClienteSugerido = (sug: ClienteSugeridoMesa) => {
    setClienteId(sug.id);
    setClienteNombre(sug.nombre || '');
    setClienteCedula(sug.rif_cedula || '');
    setClienteTelefono(sug.telefono || '');
    setMostrarDropdownClientes(false);
    setSugerenciasClientes([]);
  };

  const limpiarClienteSeleccionado = () => {
    setClienteId('');
    setClienteNombre('');
    setClienteCedula('');
    setClienteTelefono('');
    setMostrarDropdownClientes(false);
    setSugerenciasClientes([]);
  };

  const [propina, setPropina] = useState<number>(0);
  const [copias, setCopias] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [comentandoKey, setComentandoKey] = useState<string | null>(null);

  const DRAFT_KEY = `niteo_comanda_draft_${terminal.terminalCode}`;

  // Restaurar borrador de localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.carrito) && parsed.carrito.length > 0) {
          setCarrito(parsed.carrito);
        }
        if (parsed.mesa) setMesa(parsed.mesa);
        if (parsed.clienteNombre) setClienteNombre(parsed.clienteNombre);
        if (parsed.clienteCedula) setClienteCedula(parsed.clienteCedula);
        if (parsed.clienteTelefono) setClienteTelefono(parsed.clienteTelefono);
        if (parsed.clienteId) setClienteId(parsed.clienteId);
        if (parsed.propina) setPropina(Number(parsed.propina) || 0);
        if (parsed.copias) setCopias(Number(parsed.copias) === 2 ? 2 : 1);
      }
    } catch {
      // Ignorar error al leer borrador
    }
  }, [DRAFT_KEY]);

  // Persistir borrador de comanda automáticamente
  useEffect(() => {
    try {
      if (carrito.length > 0 || mesa || clienteNombre) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          carrito,
          mesa,
          clienteNombre,
          clienteCedula,
          clienteTelefono,
          clienteId,
          propina,
          copias,
        }));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // Ignorar error de cuota de localStorage
    }
  }, [DRAFT_KEY, carrito, mesa, clienteNombre, clienteCedula, clienteTelefono, clienteId, propina, copias]);

  const cargarCatalogo = useCallback(async () => {
    setLoading(true);
    const [prods, tasaActual] = await Promise.all([
      obtenerCatalogoMesa(terminal.sedeId),
      obtenerTasaMesa(terminal.sedeId),
    ]);
    const safeProds = Array.isArray(prods) ? prods : [];
    setProductos(safeProds);
    if (tasaActual && tasaActual > 0) {
      setTasaEfectiva(tasaActual);
    }
    const cats = ['Todos', ...Array.from(new Set(
      safeProds.map((p: any) => p.categorias?.nombre as string || 'Sin categoría')
    ))];
    setCategorias(cats);
    setLoading(false);
  }, [terminal.sedeId]);

  useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);

  const normalizarBusqueda = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const prodsFiltrados = productos.filter((p: any) => {
    const matchCat = catActiva === 'Todos' || (p.categorias?.nombre || 'Sin categoría') === catActiva;
    if (!busqueda.trim()) return matchCat;

    const q = busqueda.trim().toLowerCase();
    const qNorm = normalizarBusqueda(q);
    const nom = (p?.nombre || '').toLowerCase();
    const nomNorm = normalizarBusqueda(nom);

    const matchSearch = nom.includes(q) || nomNorm.includes(qNorm);
    return matchCat && matchSearch;
  });
  
  const getCartInfo = (prodId: string) => {
    const items = carrito.filter(i => i.producto_id === prodId);
    if (items.length === 0) return null;
    const totalCantidad = items.reduce((s, i) => s + i.cantidad, 0);
    return { totalCantidad };
  };

  const agregarAlCarrito = (prod: any) => {
    const nombreNorm = (prod?.nombre || '').toLowerCase();
    const esPromoCocktail = nombreNorm.includes('cócteles 2x1') ||
                           nombreNorm.includes('cocteles 2x1') ||
                           (nombreNorm.includes('promo') && nombreNorm.includes('2x1'));

    if (esPromoCocktail) {
      setPromoSeleccionada(prod);
      setModalPromoAbierto(true);
      return;
    }

    const notasProd = extraerNotasPreparacion(prod);
    const comentarioInicial = notasProd.length > 0 ? notasProd.join(', ') : '';

    setCarrito(prev => {
      const prodId = prod.id;
      const existe = prev.find(i => i.producto_id === prodId && i.comentario === comentarioInicial);
      if (existe) {
        return prev.map(i => i.key === existe.key ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, {
        key: `${prodId}-${Date.now()}`,
        producto_id: prodId,
        nombre: prod.nombre,
        cantidad: 1,
        precio_unitario: Number(prod.precio_venta),
        comentario: comentarioInicial,
        notas_preparacion: notasProd,
      }];
    });
  };

  const handleConfirmarPromoCocktail = (item: {
    producto_id: string;
    nombre: string;
    precio_unitario: number;
    notas_preparacion: string[];
    comentario: string;
  }) => {
    const key = `${item.producto_id}-${Date.now()}`;
    setCarrito(prev => [
      ...prev,
      {
        key,
        producto_id: item.producto_id,
        nombre: item.nombre,
        cantidad: 1,
        precio_unitario: item.precio_unitario,
        comentario: item.comentario,
        notas_preparacion: item.notas_preparacion,
      }
    ]);
  };

  const eliminarItem = (key: string) => {
    setCarrito(prev => prev.filter(i => i.key !== key));
  };

  const cambiarCantidad = (key: string, delta: number) => {
    setCarrito(prev =>
      prev.map(i => i.key === key ? { ...i, cantidad: i.cantidad + delta } : i)
          .filter(i => i.cantidad > 0)
    );
  };

  const actualizarComentario = (key: string, comentario: string) => {
    setCarrito(prev => prev.map(i => i.key === key ? { ...i, comentario } : i));
  };

  const toggleComentarioRapido = (key: string, texto: string) => {
    setCarrito(prev => prev.map(i => {
      if (i.key !== key) return i;
      let partes = (i.comentario || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      if (partes.length === 1 && partes[0].includes(',')) {
        partes = partes[0].split(',').map(s => s.trim()).filter(Boolean);
      }
      const existeIdx = partes.findIndex(p => p.toLowerCase() === texto.toLowerCase());
      let nuevasPartes: string[];
      if (existeIdx >= 0) {
        nuevasPartes = partes.filter((_, idx) => idx !== existeIdx);
      } else {
        nuevasPartes = [...partes, texto];
      }
      return { ...i, comentario: nuevasPartes.join('\n') };
    }));
  };

  const seleccionarTodasNotasProducto = (key: string, notasProd: string[]) => {
    setCarrito(prev => prev.map(i => {
      if (i.key !== key) return i;
      let partes = (i.comentario || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      if (partes.length === 1 && partes[0].includes(',')) {
        partes = partes[0].split(',').map(s => s.trim()).filter(Boolean);
      }
      const faltantes = notasProd.filter(n => !partes.some(p => p.toLowerCase() === n.toLowerCase()));
      const nuevasPartes = [...partes, ...faltantes];
      return { ...i, comentario: nuevasPartes.join('\n') };
    }));
  };

  const subtotal = carrito.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const total = subtotal + propina;

  const handleEnviar = async () => {
    if (carrito.length === 0) { setError('Agrega al menos un producto'); return; }
    setError('');
    setEnviando(true);
    try {
      let nombreFinal = clienteNombre.trim();
      if (clienteCedula.trim()) nombreFinal += ` - CI/NIT: ${clienteCedula.trim()}`;
      if (clienteTelefono.trim()) nombreFinal += ` - Tel: ${clienteTelefono.trim()}`;

      const mesaFinal = mesa.trim() || clienteNombre.trim() || `Orden #${String(Date.now()).slice(-4)}`;

      const result = await enviarComanda({
        terminalCode: terminal.terminalCode,
        tipo: 'comanda',
        mesaIdentificador: mesaFinal,
        clienteNombre: nombreFinal || undefined,
        clienteCedula: clienteCedula.trim() || undefined,
        clienteTelefono: clienteTelefono.trim() || undefined,
        clienteId: clienteId || undefined,
        montoPropina: propina > 0 ? propina : undefined,
        numeroCopias: copias,
        items: carrito.map(({ key, notas_preparacion, ...rest }) => rest),
      });
      if (!result.success) { setError(result.error || 'Error enviando la comanda'); return; }
      setEnviado(true);
      setTimeout(() => {
        setEnviado(false);
        setCarrito([]);
        setMesa('');
        setClienteId('');
        setClienteNombre('');
        setClienteTelefono('');
        setClienteCedula('');
        setSugerenciasClientes([]);
        setMostrarDropdownClientes(false);
        setPropina(0);
        setCopias(1);
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        onLimpiarMesaPreseleccionada?.();
        setCartOpen(false);
      }, 1500);
    } catch {
      setError('Error de conexión');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-500 text-sm">Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Selector de Mesa (Opcional) y Mesas Activas */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        {/* Mesas Activas Rápidas */}
        {mesasAbiertas && mesasAbiertas.length > 0 && (
          <div className="mb-3.5 pb-3 border-b border-neutral-800">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <TableProperties size={13} className="text-indigo-400" /> Mesas Activas en Vivo
              </span>
              <span className="text-[10px] text-neutral-500 font-medium">
                {mesasAbiertas.length} mesa{mesasAbiertas.length > 1 ? 's' : ''} abierta{mesasAbiertas.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {mesasAbiertas.map((m: any) => {
                let num = String(m.mesa_identificador || '').trim();
                if (num.toLowerCase().startsWith('mesa ')) num = num.substring(5).trim();
                if (num.includes(' - ')) num = num.split(' - ')[0].trim();
                const esSeleccionada =
                  mesa.trim().toLowerCase() === num.trim().toLowerCase() ||
                  mesa.trim().toLowerCase() === String(m.mesa_identificador).trim().toLowerCase();

                return (
                  <button
                    key={m.id || num}
                    type="button"
                    onClick={() => {
                      if (onSeleccionarMesaAbierta) {
                        onSeleccionarMesaAbierta(m);
                      } else {
                        setMesa(num);
                      }
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 active:scale-95 ${
                      esSeleccionada
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-500/30'
                        : 'bg-neutral-800/90 hover:bg-neutral-800 text-neutral-300 border-neutral-700/80 hover:border-neutral-600'
                    }`}
                  >
                    <span>{/^(mesa|orden|barra|terraza)/i.test(num) ? num : `Mesa ${num}`}</span>
                    {Number(m.total) > 0 && (
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold ${
                          esSeleccionada ? 'bg-indigo-700 text-indigo-100' : 'bg-neutral-900 text-emerald-400'
                        }`}
                      >
                        ${Number(m.total).toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Mesa / Identificador (opcional)</label>
          {tasaEfectiva > 0 && (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Tasa POS: Bs. {formatearBs(tasaEfectiva)}
            </span>
          )}
        </div>
        <div className="relative flex items-center">
          <Hash size={18} className="absolute left-3.5 text-neutral-500" />
          <input
            type="text"
            inputMode="text"
            value={mesa}
            onChange={e => setMesa(e.target.value)}
            placeholder="Ej: 5, A3, Barra o dejar vacío"
            className="w-full h-14 bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-10 text-white text-lg font-semibold placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {mesa && (
            <button
              onClick={() => {
                setMesa('');
                onLimpiarMesaPreseleccionada?.();
              }}
              className="absolute right-3 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Indicador visual de agregar a mesa existente */}
        {mesa.trim() && (
          <div className="mt-2.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs text-indigo-200 truncate">
                Agregando ronda a: <strong>{/^(mesa|orden|barra)/i.test(mesa) ? mesa : `Mesa ${mesa}`}</strong>
                {mesaPreseleccionada?.totalActual ? ` (Total previo: $${mesaPreseleccionada.totalActual.toFixed(2)})` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMesa('');
                onLimpiarMesaPreseleccionada?.();
              }}
              className="text-[11px] text-neutral-400 hover:text-white underline shrink-0 ml-2"
            >
              Nueva mesa
            </button>
          </div>
        )}

        {/* Separador fino */}
        <div className="h-[1px] bg-neutral-800/80 my-3.5" />

        {/* Datos del Cliente al Inicio */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <User size={14} className="text-indigo-400" />
              Datos del Cliente (opcional)
            </label>
            {clienteId && (
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <UserCheck size={11} /> Registrado
              </span>
            )}
          </div>

          {clienteId ? (
            <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck size={18} className="text-indigo-400 shrink-0" />
                <div className="truncate">
                  <span className="text-sm font-bold text-white block truncate">{clienteNombre}</span>
                  <span className="text-xs text-neutral-400 block truncate">
                    {clienteCedula ? `CI: ${clienteCedula}` : 'Sin CI'} {clienteTelefono ? `· Tel: ${clienteTelefono}` : ''}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={limpiarClienteSeleccionado}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors ml-2 shrink-0"
                title="Cambiar cliente"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Cédula / RIF */}
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 mb-1 flex items-center justify-between">
                    <span>Cédula / RIF</span>
                    {buscandoCliente && <Loader2 size={11} className="animate-spin text-indigo-400" />}
                  </label>
                  <input
                    type="text"
                    value={clienteCedula}
                    onChange={e => {
                      const val = e.target.value;
                      setClienteCedula(val);
                      dispararBusquedaClientes(val, true);
                    }}
                    onFocus={() => {
                      if (sugerenciasClientes.length > 0) setMostrarDropdownClientes(true);
                    }}
                    placeholder="Ej: 29752069"
                    className="w-full h-11 bg-neutral-800 border border-neutral-700 rounded-xl px-3 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 mb-1 block">Teléfono</label>
                  <input
                    type="tel"
                    value={clienteTelefono}
                    onChange={e => setClienteTelefono(e.target.value)}
                    placeholder="Ej: 04141234567"
                    className="w-full h-11 bg-neutral-800 border border-neutral-700 rounded-xl px-3 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Nombre del Cliente con autocompletado */}
              <div className="relative">
                <label className="text-[11px] font-medium text-neutral-400 mb-1 flex items-center justify-between">
                  <span>Nombre del Cliente</span>
                  {buscandoCliente && <Loader2 size={11} className="animate-spin text-indigo-400" />}
                </label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={e => {
                    const val = e.target.value;
                    setClienteNombre(val);
                    dispararBusquedaClientes(val, false);
                  }}
                  onFocus={() => {
                    if (sugerenciasClientes.length > 0) setMostrarDropdownClientes(true);
                  }}
                  placeholder="Buscar o escribir nombre (Ej: Juan Pérez)"
                  className="w-full h-11 bg-neutral-800 border border-neutral-700 rounded-xl px-3 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />

                {/* Dropdown de Sugerencias */}
                {mostrarDropdownClientes && sugerenciasClientes.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-neutral-900 border border-indigo-500/40 rounded-xl shadow-2xl overflow-hidden divide-y divide-neutral-800 animate-in fade-in duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-neutral-950 flex items-center justify-between">
                      <span>Clientes Encontrados ({sugerenciasClientes.length})</span>
                      <button
                        type="button"
                        onClick={() => setMostrarDropdownClientes(false)}
                        className="text-neutral-500 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                      {sugerenciasClientes.map(sug => (
                        <button
                          key={sug.id}
                          type="button"
                          onClick={() => seleccionarClienteSugerido(sug)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-800 active:bg-neutral-800 flex items-center justify-between text-xs text-white transition-colors"
                        >
                          <div className="truncate">
                            <span className="font-bold text-sm block truncate text-white">{sug.nombre}</span>
                            <span className="text-[11px] text-neutral-400 block truncate">
                              {sug.rif_cedula ? `CI: ${sug.rif_cedula}` : 'Sin CI'} {sug.telefono ? `· Tel: ${sug.telefono}` : ''}
                            </span>
                          </div>
                          <ChevronRight size={14} className="text-indigo-400 shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Impresiones de Comanda (1 o 2) */}
        <div className="mt-3 flex items-center justify-between bg-neutral-800/80 border border-neutral-700/80 rounded-xl px-3.5 py-2.5">
          <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
            <Printer size={15} className="text-indigo-400" />
            Imprimir comanda:
          </span>
          <div className="flex bg-neutral-900 border border-neutral-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setCopias(1)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                copias === 1
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              1 comanda
            </button>
            <button
              type="button"
              onClick={() => setCopias(2)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                copias === 2
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              2 comandas
            </button>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
        <input
          type="text"
          placeholder="Buscar productos (mojito, pizza, promo, 2x1...)..."
          value={busqueda}
          onChange={(e) => {
            const val = e.target.value;
            setBusqueda(val);
            if (val.trim() && catActiva !== 'Todos') {
              setCatActiva('Todos');
            }
          }}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filtros de categoría */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCatActiva(cat)}
            className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
              catActiva === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={cargarCatalogo}
          className="shrink-0 px-4 py-2.5 rounded-full text-sm font-medium bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Grid de productos */}
      {prodsFiltrados.length === 0 ? (
        <div className="text-center py-10 text-neutral-600 text-sm">
          {productos.length === 0 ? 'Este terminal no tiene productos configurados' : 'No hay productos en esta categoría'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
            {prodsFiltrados.map((prod: any) => {
              const prodId = prod.id;
              const cartInfo = getCartInfo(prodId);
              const inCart = !!cartInfo;
              return (
                <div key={prod.id} className="relative h-full">
                  <button
                    onClick={() => agregarAlCarrito(prod)}
                    className={`w-full h-full border p-3.5 rounded-2xl flex flex-col items-start justify-between min-h-[120px] text-left active:scale-[0.97] transition-all group relative overflow-hidden touch-manipulation ${
                      inCart
                        ? 'border-indigo-500 bg-indigo-500/15 shadow-[0_0_18px_rgba(99,102,241,0.22)] ring-1 ring-indigo-500/50'
                        : 'bg-neutral-900 border-neutral-800 hover:border-indigo-500/50 active:bg-neutral-800/80'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20 animate-in zoom-in-75 duration-150">
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCarrito(prev => prev.filter(i => i.producto_id !== prodId));
                          }}
                          className="w-7 h-7 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-full flex items-center justify-center transition-all active:scale-75 border border-rose-500/30 cursor-pointer shadow-sm"
                          title="Quitar"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </span>
                        <span className="bg-indigo-600 text-white text-xs font-black min-w-[26px] h-7 px-2 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/40 pointer-events-none">
                          {cartInfo.totalCantidad}
                        </span>
                      </div>
                    )}

                    <div>
                      {(() => {
                        const nLow = (prod.nombre || '').toLowerCase();
                        const esPromo = nLow.includes('promo') || nLow.includes('2x1');
                        if (!esPromo) return null;
                        return (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
                            <Sparkles size={10} /> 2x1
                          </span>
                        );
                      })()}
                      <p className={`text-xs sm:text-sm font-semibold leading-snug break-words whitespace-normal transition-colors ${inCart ? 'pr-14 text-white' : 'text-neutral-200 group-hover:text-white'}`}>
                        {prod.nombre}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-col items-start gap-0.5">
                      <span className={`text-base font-extrabold ${inCart ? 'text-indigo-400' : 'text-neutral-300'}`}>
                        ${Number(prod.precio_venta).toFixed(2)}
                      </span>
                      {tasaEfectiva > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-400">
                          Bs. {formatearBs(Number(prod.precio_venta) * tasaEfectiva)}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}

      {/* Carrito Sticky Footer y Modal */}
      {carrito.length > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-800 p-4 pb-[env(safe-area-inset-bottom,16px)] z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          {mesa.trim() && (
            <p className="text-indigo-300 text-xs text-center mb-2 font-medium">📍 Mesa {mesa.trim()}</p>
          )}
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-3 px-5 font-bold flex justify-between items-center transition-all shadow-lg shadow-indigo-600/20 text-base"
          >
            <div className="flex gap-2 items-center">
              <ShoppingCart size={20} />
              <span>Ver Comanda ({carrito.reduce((s, i) => s + i.cantidad, 0)} ítems)</span>
            </div>
            <div className="text-right">
              <span className="block font-black text-sm md:text-base">${total.toFixed(2)} USD</span>
              {tasaEfectiva > 0 && (
                <span className="block text-xs font-bold text-emerald-300">
                  Bs. {formatearBs(total * tasaEfectiva)}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Modal Bottom Sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative bg-neutral-900 rounded-t-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="w-10 h-1.5 rounded-full bg-neutral-700 mx-auto mt-3 mb-2" />
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-400" />
                Resumen de Comanda
              </h3>
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
                title="Cerrar comanda"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cabecera de Comanda en Carrito: Mesa y Cliente */}
            <div className="mx-4 mt-2.5 bg-neutral-950/80 border border-neutral-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-indigo-400">
                  {mesa.trim() ? (/^(mesa|orden|barra)/i.test(mesa.trim()) ? mesa.trim() : `Mesa ${mesa.trim()}`) : 'Sin mesa'}
                </span>
                {meseroNombre && <span className="text-neutral-500 text-[11px] truncate">· {meseroNombre}</span>}
              </div>
              {clienteNombre.trim() ? (
                <div className="flex items-center gap-1.5 text-neutral-200 font-semibold truncate ml-2">
                  <User size={13} className="text-indigo-400 shrink-0" />
                  <span className="truncate">{clienteNombre.trim()}</span>
                  {clienteCedula.trim() && <span className="text-neutral-500 font-normal text-[11px]">({clienteCedula.trim()})</span>}
                </div>
              ) : (
                <span className="text-neutral-500 text-[11px]">Cliente general</span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {carrito.map((item) => {
                const prodCatalogo = productos.find(p => p.id === item.producto_id);
                const notasProd = (item.notas_preparacion && item.notas_preparacion.length > 0)
                  ? item.notas_preparacion
                  : extraerNotasPreparacion(prodCatalogo);
                const partesActivas = (item.comentario || '')
                  .split(/[,\n]/)
                  .map(s => s.trim().toLowerCase())
                  .filter(Boolean);
                const mostrarPanelComentarios = comentandoKey === item.key || notasProd.length > 0 || Boolean(item.comentario);

                return (
                  <div key={item.key} className="space-y-2.5 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/80">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs sm:text-sm font-bold leading-snug break-words whitespace-normal">{item.nombre}</p>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <p className="text-indigo-400 text-xs font-semibold">${(item.cantidad * item.precio_unitario).toFixed(2)}</p>
                          {tasaEfectiva > 0 && (
                            <span className="text-emerald-400 text-[11px] font-bold">
                              · Bs. {formatearBs(item.cantidad * item.precio_unitario * tasaEfectiva)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                        <button onClick={() => cambiarCantidad(item.key, -1)} className="w-10 h-10 rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white flex items-center justify-center transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="text-white text-sm font-black w-6 text-center">{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(item.key, 1)} className="w-10 h-10 rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white flex items-center justify-center transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => eliminarItem(item.key)}
                        className="w-10 h-10 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-2 items-start">
                        <button
                          type="button"
                          onClick={() => setComentandoKey(comentandoKey === item.key ? null : item.key)}
                          className={`${
                            mostrarPanelComentarios ? 'min-w-12 min-h-12 px-3.5' : 'w-full min-h-12 px-4 py-3'
                          } rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2.5 text-sm font-semibold active:scale-95 touch-manipulation ${
                            item.comentario
                              ? 'text-amber-400 bg-amber-500/15 border border-amber-500/40'
                              : 'text-neutral-200 bg-neutral-800/90 border border-neutral-700 hover:bg-neutral-800 hover:text-white'
                          }`}
                          title="Agregar nota para cocina"
                        >
                          <MessageSquare size={22} className="text-amber-400 shrink-0" />
                          {!mostrarPanelComentarios && <span>Agregar comentario / nota de cocina</span>}
                        </button>
                        {mostrarPanelComentarios && (
                          <textarea
                            rows={Math.min(6, Math.max(2, (item.comentario || '').split('\n').length))}
                            value={item.comentario}
                            onChange={e => actualizarComentario(item.key, e.target.value)}
                            onInput={e => {
                              const el = e.currentTarget;
                              el.style.height = 'auto';
                              el.style.height = Math.max(52, el.scrollHeight) + 'px';
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                              }
                            }}
                            placeholder="Nota para cocina (sin cebolla, bien cocido...)"
                            autoFocus={comentandoKey === item.key}
                            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors resize-y min-h-[52px] break-words whitespace-pre-wrap leading-relaxed"
                          />
                        )}
                      </div>

                      {mostrarPanelComentarios && (
                        <div className="space-y-2 pl-1">
                          {notasProd.length > 0 && (
                            <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                  Comentarios del producto:
                                </span>
                                {notasProd.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => seleccionarTodasNotasProducto(item.key, notasProd)}
                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline"
                                  >
                                    + Seleccionar todas
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {notasProd.map((txt: string, idx: number) => {
                                  const estaActivo = partesActivas.includes(txt.toLowerCase());
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => toggleComentarioRapido(item.key, txt)}
                                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                                        estaActivo
                                          ? 'bg-amber-500 text-neutral-950 font-bold border border-amber-400 shadow-sm'
                                          : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                                      }`}
                                    >
                                      <span>{estaActivo ? '✓' : '+'}</span>
                                      <span>{txt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mr-1">
                              Recomendados:
                            </span>
                            {COMENTARIOS_RAPIDOS.map(txt => {
                              const estaActivo = partesActivas.includes(txt.toLowerCase());
                              return (
                                <button
                                  key={txt}
                                  type="button"
                                  onClick={() => toggleComentarioRapido(item.key, txt)}
                                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                                    estaActivo
                                      ? 'bg-indigo-600 text-white font-bold border border-indigo-400'
                                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                                  }`}
                                >
                                  <span>{estaActivo ? '✓' : '+'}</span>
                                  <span>{txt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              <div className="border-t border-neutral-800 pt-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-300 font-bold">Total estimado</span>
                  <span className="text-white text-xl font-black">${subtotal.toFixed(2)}</span>
                </div>
                {tasaEfectiva > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Total en Bolívares (Tasa: {formatearBs(tasaEfectiva)})</span>
                    <span className="text-emerald-400 font-black text-base">Bs. {formatearBs(subtotal * tasaEfectiva)}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 mt-4">
                  <p className="text-rose-400 text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-neutral-950 border-t border-neutral-800 pb-[env(safe-area-inset-bottom,16px)] space-y-3">
              {/* Selector de copias en modal */}
              <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Printer size={15} className="text-indigo-400" />
                  Imprimir comanda:
                </span>
                <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setCopias(1)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      copias === 1
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    1 comanda
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopias(2)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      copias === 2
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    2 comandas
                  </button>
                </div>
              </div>

              <button
                onClick={handleEnviar}
                disabled={enviando || carrito.length === 0}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                  enviado
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white'
                }`}
              >
                {enviando ? (
                  <><Loader2 size={20} className="animate-spin" /> Enviando...</>
                ) : enviado ? (
                  <><CheckCircle2 size={20} /> ¡Comanda enviada al POS!</>
                ) : (
                  <><Send size={20} /> Confirmar y Enviar</>
                )}
              </button>
              <p className="text-neutral-600 text-xs text-center mt-2">
                Se enviará al Terminal POS · {terminal.terminalCode}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de Cócteles 2x1 */}
      <PromoCocktailModal
        isOpen={modalPromoAbierto}
        onClose={() => setModalPromoAbierto(false)}
        catalogo={productos}
        promoProductoId={promoSeleccionada?.id}
        onConfirmar={handleConfirmarPromoCocktail}
      />
    </div>
  );
}
