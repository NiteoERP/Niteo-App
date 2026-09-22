'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, Send, MessageSquare, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { obtenerCatalogoMesa, enviarComanda, type ItemComanda } from '@/actions/mesas-actions';
import type { TerminalVinculado } from './MesasHub';

interface CartItem extends ItemComanda {
  key: string;
}

interface Props {
  terminal: TerminalVinculado;
  meseroNombre: string;
}

export default function NuevaComanda({ terminal, meseroNombre }: Props) {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [catActiva, setCatActiva] = useState<string>('Todos');
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [mesa, setMesa] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [comentarioGeneral, setComentarioGeneral] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [comentandoKey, setComentandoKey] = useState<string | null>(null);

  const cargarCatalogo = useCallback(async () => {
    setLoading(true);
    const prods = await obtenerCatalogoMesa(terminal.sedeId);
    setProductos(prods);
    const cats = ['Todos', ...Array.from(new Set(
      prods.map((p: any) => p.categorias?.nombre as string || 'Sin categoría')
    ))];
    setCategorias(cats);
    setLoading(false);
  }, [terminal.sedeId]);

  useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);

  const prodsFiltrados = catActiva === 'Todos'
    ? productos
    : productos.filter((p: any) => (p.categorias?.nombre || 'Sin categoría') === catActiva);

  const agregarAlCarrito = (prod: any) => {
    setCarrito(prev => {
      const prodId = prod.id_pos || prod.id;
      const existe = prev.find(i => i.producto_id === prodId && i.comentario === '');
      if (existe) {
        return prev.map(i => i.key === existe.key ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, {
        key: `${prodId}-${Date.now()}`,
        producto_id: prodId,
        nombre: prod.nombre,
        cantidad: 1,
        precio_unitario: Number(prod.precio_venta),
        comentario: '',
      }];
    });
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

  const total = carrito.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  const handleEnviar = async () => {
    if (!mesa.trim()) { setError('Ingresa el número de mesa'); return; }
    if (carrito.length === 0) { setError('Agrega al menos un producto'); return; }
    setError('');
    setEnviando(true);
    try {
      const result = await enviarComanda({
        terminalCode: terminal.terminalCode,
        tipo: 'comanda',
        mesaIdentificador: mesa.trim(),
        clienteNombre: clienteNombre.trim() || undefined,
        comentarioGeneral: comentarioGeneral.trim() || undefined,
        items: carrito.map(({ key, ...rest }) => rest),
      });
      if (!result.success) { setError(result.error || 'Error enviando la comanda'); return; }
      setEnviado(true);
      setCarrito([]);
      setClienteNombre('');
      setComentarioGeneral('');
      setTimeout(() => setEnviado(false), 3500);
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
      {/* Datos del pedido */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-300">Datos del Pedido</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Mesa *</label>
            <input
              type="text"
              value={mesa}
              onChange={e => setMesa(e.target.value)}
              placeholder="Ej: 5, A3"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Cliente (opcional)</label>
            <input
              type="text"
              value={clienteNombre}
              onChange={e => setClienteNombre(e.target.value)}
              placeholder="Nombre"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Nota general (opcional)</label>
          <input
            type="text"
            value={comentarioGeneral}
            onChange={e => setComentarioGeneral(e.target.value)}
            placeholder="Ej: cliente alérgico a mariscos"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Filtros de categoría */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCatActiva(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 flex items-center gap-1 transition-colors"
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
        <div className="grid grid-cols-2 gap-2">
          {prodsFiltrados.map((prod: any) => (
            <button
              key={prod.id}
              onClick={() => agregarAlCarrito(prod)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-left active:scale-95 transition-transform hover:border-indigo-500/50 group"
            >
              <p className="text-white text-sm font-medium line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">{prod.nombre}</p>
              <p className="text-indigo-400 text-sm font-bold mt-1.5">${Number(prod.precio_venta).toFixed(2)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Carrito */}
      {carrito.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-300">Comanda ({carrito.length} ítem{carrito.length > 1 ? 's' : ''})</h3>
          {carrito.map((item) => (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.nombre}</p>
                  <p className="text-neutral-500 text-xs">${(item.cantidad * item.precio_unitario).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setComentandoKey(comentandoKey === item.key ? null : item.key)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.comentario ? 'text-indigo-400 bg-indigo-500/10' : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    <MessageSquare size={13} />
                  </button>
                  <button onClick={() => cambiarCantidad(item.key, -1)} className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors">
                    <Minus size={13} />
                  </button>
                  <span className="text-white text-sm font-semibold w-5 text-center">{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(item.key, 1)} className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-indigo-500/20 hover:text-indigo-400 flex items-center justify-center transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              {comentandoKey === item.key && (
                <input
                  type="text"
                  value={item.comentario}
                  onChange={e => actualizarComentario(item.key, e.target.value)}
                  placeholder="Nota para cocina (sin cebolla, término, alergía...)"
                  autoFocus
                  className="w-full bg-neutral-800 border border-indigo-500/50 rounded-lg px-3 py-2 text-white text-xs placeholder:text-neutral-600 focus:outline-none transition-colors"
                />
              )}
            </div>
          ))}
          <div className="border-t border-neutral-800 pt-3 flex items-center justify-between">
            <span className="text-neutral-400 text-sm">Total estimado</span>
            <span className="text-white font-bold">${total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleEnviar}
        disabled={enviando || carrito.length === 0 || !mesa.trim()}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
          enviado
            ? 'bg-green-600 text-white'
            : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white'
        }`}
      >
        {enviando ? (
          <><Loader2 size={20} className="animate-spin" /> Enviando...</>
        ) : enviado ? (
          <><CheckCircle2 size={20} /> ¡Comanda enviada al POS!</>
        ) : (
          <><Send size={20} /> Enviar Comanda al POS</>
        )}
      </button>
    </div>
  );
}
