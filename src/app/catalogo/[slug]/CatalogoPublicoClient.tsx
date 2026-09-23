'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X,
  MessageCircle, ChevronDown, Store, Tag, Package,
  Zap, AlertCircle,
} from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precio_venta: number;
  imagen_url?: string;
  categorias?: { id: string; nombre: string } | null;
  estado_activo: boolean;
  stock_disponible?: number | null;
}

interface CartItem extends Producto {
  cantidad: number;
}

interface Empresa {
  id: string;
  nombre_comercial: string;
  slug_catalogo: string;
  whatsapp_catalogo: string | null;
  simbolo_moneda: string;
  moneda: string;
}

interface Props {
  empresa: Empresa;
  productos: Producto[];
  categorias: { id: string; nombre: string }[];
}

export default function CatalogoPublicoClient({ empresa, productos: productosIniciales, categorias }: Props) {
  const [productos, setProductos] = useState<Producto[]>(productosIniciales);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [notaAdicional, setNotaAdicional] = useState('');
  const sim = empresa.simbolo_moneda || '$';

  // ── Realtime: suscribirse a cambios en productos ──────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`catalogo-${empresa.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productos',
          filter: `empresa_id=eq.${empresa.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProd = payload.new as Producto;
            if (newProd.estado_activo) {
              setProductos(prev => [...prev, newProd].sort((a, b) => a.nombre.localeCompare(b.nombre)));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Producto;
            setProductos(prev => {
              if (!updated.estado_activo) {
                // Remover del carrito si ya no está activo
                setCart(c => c.filter(i => i.id !== updated.id));
                return prev.filter(p => p.id !== updated.id);
              }
              return prev.map(p => p.id === updated.id ? { ...p, ...updated } : p);
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setProductos(prev => prev.filter(p => p.id !== deletedId));
            setCart(c => c.filter(i => i.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresa.id]);

  // ── Carrito ───────────────────────────────────────────────────
  const addToCart = useCallback((prod: Producto) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === prod.id);
      if (existing) {
        if (prod.stock_disponible !== null && prod.stock_disponible !== undefined && existing.cantidad >= prod.stock_disponible) {
          alert('¡Stock máximo alcanzado! Solo hay ' + prod.stock_disponible + ' disponibles.');
          return prev;
        }
        return prev.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      if (prod.stock_disponible !== null && prod.stock_disponible !== undefined && prod.stock_disponible < 1) {
         return prev;
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      const newQty = item.cantidad + delta;
      
      if (delta > 0 && item.stock_disponible !== null && item.stock_disponible !== undefined && newQty > item.stock_disponible) {
         alert('¡Stock máximo alcanzado! Solo hay ' + item.stock_disponible + ' disponibles.');
         return prev;
      }
      
      return prev
        .map(i => i.id === id ? { ...i, cantidad: newQty } : i)
        .filter(i => i.cantidad > 0);
    });
  }, []);

  const cartCount = cart.reduce((acc, i) => acc + i.cantidad, 0);
  const cartTotal = cart.reduce((acc, i) => acc + i.cantidad * i.precio_venta, 0);

  // ── Productos filtrados ───────────────────────────────────────
  const filtered = productos.filter(p => {
    const matchesSearch = (p.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCat = !selectedCategoria || p.categorias?.id === selectedCategoria;
    return matchesSearch && matchesCat;
  });

  // ── WhatsApp ──────────────────────────────────────────────────
  const buildWhatsAppMessage = () => {
    const lines = [
      `🛒 *Pedido - ${empresa.nombre_comercial}*`,
      nombreCliente ? `👤 Cliente: *${nombreCliente}*` : '',
      '',
      '*Productos:*',
      ...cart.map(i => `• ${i.cantidad}x ${i.nombre} — ${sim}${(i.cantidad * i.precio_venta).toFixed(2)}`),
      '',
      `💰 *Total: ${sim}${cartTotal.toFixed(2)}*`,
      notaAdicional ? `📝 Nota: ${notaAdicional}` : '',
      '',
      `_Pedido realizado desde el catálogo digital de ${empresa.nombre_comercial}_`,
    ].filter(Boolean).join('\n');

    return encodeURIComponent(lines);
  };

  const handleEnviarPedido = () => {
    if (cart.length === 0) return;
    if (!empresa.whatsapp_catalogo) {
      alert('Este negocio aún no tiene configurado su número de WhatsApp para pedidos.');
      return;
    }
    const numero = empresa.whatsapp_catalogo.replace(/\D/g, '');
    const mensaje = buildWhatsAppMessage();
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
    setPedidoEnviado(true);
    setTimeout(() => {
      setPedidoEnviado(false);
      setCart([]);
      setIsCartOpen(false);
      setNombreCliente('');
      setNotaAdicional('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HEAD: Google Fonts ─────────────────────────────────── */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── HERO HEADER ────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                <Store size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {empresa.nombre_comercial}
                </h1>
                <p className="text-sm text-neutral-400 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                  Catálogo en tiempo real
                </p>
              </div>
            </div>

            {/* Botón carrito flotante header */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-semibold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <ShoppingCart size={20} />
              <span>Mi pedido</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-emerald-700 text-xs font-black rounded-full flex items-center justify-center shadow">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── FILTROS ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
        {categorias.length > 0 && (
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <select
              value={selectedCategoria}
              onChange={e => setSelectedCategoria(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-xl pl-9 pr-8 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
          </div>
        )}
      </div>

      {/* ── GRID DE PRODUCTOS ───────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-32">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package size={48} className="text-neutral-700 mb-4" />
            <p className="text-neutral-500 font-medium">No hay productos disponibles</p>
            <p className="text-neutral-600 text-sm mt-1">
              {searchTerm || selectedCategoria ? 'Intenta con otra búsqueda o categoría' : 'El catálogo está vacío por el momento'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map(prod => {
              const enCart = cart.find(i => i.id === prod.id);
              return (
                <div
                  key={prod.id}
                  className="group bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 hover:shadow-xl hover:shadow-black/40 transition-all duration-200"
                >
                  {/* Imagen o placeholder */}
                  <div className="h-44 bg-neutral-800 flex items-center justify-center overflow-hidden">
                    {prod.imagen_url ? (
                      <img
                        src={prod.imagen_url}
                        alt={prod.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-neutral-700">
                        <Package size={36} />
                        <span className="text-xs">{prod.categorias?.nombre || 'Producto'}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      {prod.categorias?.nombre && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1 block">
                          {prod.categorias.nombre}
                        </span>
                      )}
                      {prod.stock_disponible !== null && prod.stock_disponible !== undefined && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 mb-1 block">
                          Solo {prod.stock_disponible} disponibles
                        </span>
                      )}
                      <h3 className="font-semibold text-white text-sm leading-tight">{prod.nombre}</h3>
                      {prod.descripcion && (
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{prod.descripcion}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-emerald-400">
                        {sim}{(Number(prod.precio_venta) || 0).toFixed(2)}
                      </span>

                      {enCart ? (
                        <div className="flex items-center gap-1.5 bg-neutral-800 rounded-xl p-1">
                          <button
                            onClick={() => updateQty(prod.id, -1)}
                            className="w-8 h-8 rounded-lg bg-neutral-700 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-400 flex items-center justify-center transition-all"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-white">{enCart.cantidad}</span>
                          <button
                            onClick={() => updateQty(prod.id, 1)}
                            className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(prod)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow shadow-emerald-500/20"
                        >
                          <Plus size={14} /> Agregar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BOTÓN CARRITO FLOTANTE (mobile, si hay items) ──────── */}
      {cartCount > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-white font-bold shadow-2xl shadow-emerald-500/30 transition-all active:scale-95"
        >
          <ShoppingCart size={20} />
          <span>Ver pedido ({cartCount})</span>
          <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm">
            {sim}{cartTotal.toFixed(2)}
          </span>
        </button>
      )}

      {/* ── DRAWER DE CARRITO ───────────────────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer */}
          <div className="relative ml-auto w-full max-w-md h-full bg-neutral-950 border-l border-neutral-800 flex flex-col shadow-2xl">
            {/* Header del carrito */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">Tu Pedido</h2>
                  <p className="text-xs text-neutral-500">{cartCount} {cartCount === 1 ? 'producto' : 'productos'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingCart size={40} className="text-neutral-700 mb-3" />
                  <p className="text-neutral-500 font-medium">Tu carrito está vacío</p>
                  <p className="text-neutral-600 text-sm mt-1">Agrega productos del catálogo</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-neutral-900 rounded-xl p-3 border border-neutral-800">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{item.nombre}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {sim}{(Number(item.precio_venta) || 0).toFixed(2)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-7 h-7 rounded-md bg-neutral-700 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-400 flex items-center justify-center transition-all"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-white">{item.cantidad}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 rounded-md text-neutral-600 hover:text-rose-400 transition-all flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-emerald-400 shrink-0 w-16 text-right">
                      {sim}{(item.cantidad * (Number(item.precio_venta) || 0)).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer del carrito */}
            {cart.length > 0 && (
              <div className="px-4 py-4 border-t border-neutral-800 space-y-4">
                {/* Nombre del cliente */}
                <input
                  type="text"
                  placeholder="Tu nombre (opcional)"
                  value={nombreCliente}
                  onChange={e => setNombreCliente(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all placeholder:text-neutral-600"
                />
                {/* Nota adicional */}
                <textarea
                  placeholder="Nota para el pedido (opcional)"
                  value={notaAdicional}
                  onChange={e => setNotaAdicional(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all placeholder:text-neutral-600 resize-none"
                />

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Total</span>
                  <span className="text-2xl font-black text-white">{sim}{cartTotal.toFixed(2)}</span>
                </div>

                {/* Botón enviar */}
                {pedidoEnviado ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-emerald-400 font-semibold">
                    <Zap size={18} />
                    ¡Pedido enviado por WhatsApp!
                  </div>
                ) : (
                  <>
                    {!empresa.whatsapp_catalogo && (
                      <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        <AlertCircle size={14} />
                        Este negocio aún no configuró su WhatsApp
                      </div>
                    )}
                    <button
                      onClick={handleEnviarPedido}
                      disabled={!empresa.whatsapp_catalogo}
                      className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-[#25D366]/20"
                    >
                      <MessageCircle size={20} />
                      Enviar pedido por WhatsApp
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
