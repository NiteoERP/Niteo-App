'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, Send, MessageSquare, Loader2, CheckCircle2, RefreshCw, ShoppingCart, X, Trash2 } from 'lucide-react';
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
  const [cartOpen, setCartOpen] = useState(false);
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
      setTimeout(() => {
        setEnviado(false);
        setCarrito([]);
        setClienteNombre('');
        setComentarioGeneral('');
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

      {/* Carrito Sticky Footer y Modal */}
      {carrito.length > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-800 p-4 pb-[env(safe-area-inset-bottom,16px)] z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <button 
            onClick={() => setCartOpen(true)} 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-3.5 px-5 font-bold flex justify-between items-center transition-all shadow-lg shadow-indigo-600/20"
          >
            <div className="flex gap-2 items-center">
              <ShoppingCart size={18} />
              <span>Ver Comanda ({carrito.length})</span>
            </div>
            <span>${total.toFixed(2)} USD</span>
          </button>
        </div>
      )}

      {/* Modal Bottom Sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative bg-neutral-900 rounded-t-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-400" />
                Resumen de Comanda
              </h3>
              <button onClick={() => setCartOpen(false)} className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {carrito.map((item) => (
                <div key={item.key} className="space-y-2 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/80">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{item.nombre}</p>
                      <p className="text-indigo-400 text-xs font-semibold">${(item.cantidad * item.precio_unitario).toFixed(2)}</p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                      <button onClick={() => cambiarCantidad(item.key, -1)} className="w-8 h-8 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white flex items-center justify-center transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="text-white text-sm font-black w-6 text-center">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.key, 1)} className="w-8 h-8 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white flex items-center justify-center transition-colors">
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
                  
                  <div className="flex gap-2 items-start mt-2">
                    <button
                      onClick={() => setComentandoKey(comentandoKey === item.key ? null : item.key)}
                      className={`p-2 rounded-lg transition-colors shrink-0 ${
                        item.comentario ? 'text-indigo-400 bg-indigo-500/10' : 'text-neutral-500 bg-neutral-800 hover:text-white'
                      }`}
                    >
                      <MessageSquare size={14} />
                    </button>
                    {comentandoKey === item.key || item.comentario ? (
                      <input
                        type="text"
                        value={item.comentario}
                        onChange={e => actualizarComentario(item.key, e.target.value)}
                        placeholder="Nota para cocina (sin cebolla, alergia...)"
                        autoFocus={comentandoKey === item.key}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    ) : null}
                  </div>
                </div>
              ))}
              
              <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Total estimado</span>
                <span className="text-white text-xl font-black">${total.toFixed(2)}</span>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 mt-4">
                  <p className="text-rose-400 text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-neutral-950 border-t border-neutral-800 pb-[env(safe-area-inset-bottom,16px)]">
              <button
                onClick={handleEnviar}
                disabled={enviando || carrito.length === 0 || !mesa.trim()}
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
              {!mesa.trim() && (
                <p className="text-rose-400 text-xs text-center mt-3 font-medium">Debes ingresar el número de mesa para enviar</p>
              )}
            </div>
          </div>
        </div>
      )}
</div>
  );
}
