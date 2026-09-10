'use client';

import React, { useState, useTransition, useMemo, useCallback } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Zap,
  CheckCircle, AlertCircle, Package, X, CreditCard,
  Loader2, Receipt
} from 'lucide-react';
import { procesarVentaVirtual } from '@/actions/ventas-virtual-actions';
import type { ProductoPOS } from '@/actions/pos-actions';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────────────────────

interface ItemCarrito {
  producto_id: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
}

interface TerminalVirtualProps {
  catalogo: ProductoPOS[];
  sedeVirtualId: string;
  metodosDisponibles?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Métodos de pago por defecto
// ─────────────────────────────────────────────────────────────────────────────
const METODOS_DEFAULT = ['Efectivo USD', 'Transferencia', 'Zelle', 'Pago Móvil', 'Punto de Venta'];

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export default function TerminalVirtual({
  catalogo,
  sedeVirtualId,
  metodosDisponibles = METODOS_DEFAULT,
}: TerminalVirtualProps) {
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [metodoPago, setMetodoPago] = useState(metodosDisponibles[0]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Filtro de catálogo ─────────────────────────────────────────────────────
  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras || '').toLowerCase().includes(q)
    );
  }, [catalogo, busqueda]);

  // ── Total del carrito ──────────────────────────────────────────────────────
  const total = useMemo(
    () => carrito.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0),
    [carrito]
  );

  const cantidadItems = carrito.reduce((acc, i) => acc + i.cantidad, 0);

  // ── Acciones del carrito ───────────────────────────────────────────────────
  const agregarProducto = useCallback((prod: ProductoPOS) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.producto_id === prod.producto_id);
      if (existe) {
        return prev.map((i) =>
          i.producto_id === prod.producto_id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          producto_id: prod.producto_id,
          nombre: prod.nombre,
          precio_unitario: prod.precio_venta,
          cantidad: 1,
        },
      ];
    });
    setResultado(null);
  }, []);

  const cambiarCantidad = useCallback((producto_id: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => (i.producto_id === producto_id ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    );
  }, []);

  const eliminarItem = useCallback((producto_id: number) => {
    setCarrito((prev) => prev.filter((i) => i.producto_id !== producto_id));
  }, []);

  const vaciarCarrito = () => {
    setCarrito([]);
    setResultado(null);
  };

  // ── Procesar venta ─────────────────────────────────────────────────────────
  const handleProcesar = () => {
    if (carrito.length === 0) return;

    startTransition(async () => {
      const res = await procesarVentaVirtual({
        sede_id: sedeVirtualId,
        items: carrito.map((i) => ({
          producto_id: i.producto_id,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
        metodo_pago: metodoPago,
      });

      if (res.success) {
        setResultado({ ok: true, msg: `Venta registrada correctamente.` });
        setCarrito([]);
        setCarritoAbierto(false);
      } else {
        setResultado({ ok: false, msg: res.error || 'Error desconocido al procesar la venta.' });
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-200px)]">

      {/* ── Panel Izquierdo: Catálogo ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-indigo-400" />
            <h2 className="text-base font-bold text-white">Terminal Virtual</h2>
            <span className="text-xs px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full font-medium">
              {catalogo.length} productos
            </span>
          </div>

          {/* Botón carrito — solo mobile */}
          <button
            onClick={() => setCarritoAbierto(true)}
            className="lg:hidden relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <ShoppingCart size={16} />
            Carrito
            {cantidadItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cantidadItems}
              </span>
            )}
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nombre o código de barras..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-12 bg-neutral-900 border border-neutral-800 text-sm text-white rounded-xl pl-10 pr-4
                       focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-500"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Feedback de resultado */}
        {resultado && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              resultado.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {resultado.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {resultado.msg}
            <button
              onClick={() => setResultado(null)}
              className="ml-auto text-neutral-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Grid de Productos */}
        <div className="flex-1 overflow-y-auto">
          {catalogoFiltrado.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500 gap-3">
              <Package size={40} className="text-neutral-700" />
              <p className="text-sm">
                {catalogo.length === 0
                  ? 'No hay productos disponibles en el canal virtual.'
                  : 'No hay resultados para tu búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {catalogoFiltrado.map((prod) => {
                const enCarrito = carrito.find((i) => i.producto_id === prod.producto_id);
                return (
                  <button
                    key={prod.producto_id}
                    onClick={() => agregarProducto(prod)}
                    className={`group relative flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
                      enCarrito
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'
                    }`}
                  >
                    {/* Badge cantidad en carrito */}
                    {enCarrito && (
                      <span className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {enCarrito.cantidad}
                      </span>
                    )}

                    {/* Ícono de producto */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${
                      enCarrito ? 'bg-indigo-500/20' : 'bg-neutral-800 group-hover:bg-neutral-700'
                    }`}>
                      <Package size={16} className={enCarrito ? 'text-indigo-400' : 'text-neutral-400'} />
                    </div>

                    {/* Nombre */}
                    <span className={`text-xs font-semibold leading-tight line-clamp-2 ${
                      enCarrito ? 'text-indigo-300' : 'text-neutral-200'
                    }`}>
                      {prod.nombre}
                    </span>

                    {/* Código */}
                    {prod.codigo_barras && (
                      <span className="text-[10px] font-mono text-neutral-500">{prod.codigo_barras}</span>
                    )}

                    {/* Precio */}
                    <span className={`text-sm font-bold mt-auto ${
                      enCarrito ? 'text-indigo-400' : 'text-emerald-400'
                    }`}>
                      ${Number(prod.precio_venta).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel Derecho: Carrito (desktop siempre visible, mobile como overlay) ── */}

      {/* Overlay mobile */}
      {carritoAbierto && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setCarritoAbierto(false)}
        />
      )}

      <div
        className={`
          lg:w-80 xl:w-96 flex flex-col gap-4
          bg-neutral-900 border border-neutral-800 rounded-2xl p-4
          lg:static lg:translate-x-0 lg:flex
          fixed right-0 top-0 bottom-0 w-80 z-50 overflow-y-auto
          transition-transform duration-300 ease-out
          ${carritoAbierto ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header del carrito */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Carrito</h3>
            {cantidadItems > 0 && (
              <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full font-medium">
                {cantidadItems} ítem{cantidadItems !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {carrito.length > 0 && (
              <button
                onClick={vaciarCarrito}
                className="text-xs text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} />
                Vaciar
              </button>
            )}
            <button
              onClick={() => setCarritoAbierto(false)}
              className="lg:hidden text-neutral-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Divisor */}
        <div className="h-px bg-neutral-800" />

        {/* Lista de ítems */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[120px]">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-600 gap-2">
              <ShoppingCart size={32} />
              <p className="text-xs">Toca un producto para agregarlo</p>
            </div>
          ) : (
            carrito.map((item) => (
              <div
                key={item.producto_id}
                className="flex items-center gap-3 bg-neutral-950/50 border border-neutral-800/50 rounded-xl p-3"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-200 truncate">{item.nombre}</p>
                  <p className="text-xs text-emerald-400 font-medium">
                    ${Number(item.precio_unitario).toFixed(2)} c/u
                  </p>
                </div>

                {/* Controles cantidad */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => cambiarCantidad(item.producto_id, -1)}
                    className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-sm font-bold text-white w-5 text-center">{item.cantidad}</span>
                  <button
                    onClick={() => cambiarCantidad(item.producto_id, 1)}
                    className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>

                {/* Subtotal + eliminar */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-bold text-white">
                    ${(item.precio_unitario * item.cantidad).toFixed(2)}
                  </span>
                  <button
                    onClick={() => eliminarItem(item.producto_id)}
                    className="text-neutral-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Divisor */}
        <div className="h-px bg-neutral-800" />

        {/* Resumen y pago */}
        <div className="flex flex-col gap-3">
          {/* Total */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Receipt size={14} className="text-neutral-400" />
              <span className="text-sm text-neutral-400 font-medium">Total</span>
            </div>
            <span className="text-xl font-black text-white">${total.toFixed(2)}</span>
          </div>

          {/* Selector de método de pago */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
              <CreditCard size={12} />
              Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {metodosDisponibles.map((metodo) => (
                <button
                  key={metodo}
                  onClick={() => setMetodoPago(metodo)}
                  className={`text-xs font-semibold px-2 py-2 rounded-lg border transition-all ${
                    metodoPago === metodo
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-neutral-950/30 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
                  }`}
                >
                  {metodo}
                </button>
              ))}
            </div>
          </div>

          {/* Botón procesar */}
          <button
            onClick={handleProcesar}
            disabled={carrito.length === 0 || isPending}
            className={`w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
              carrito.length === 0
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : isPending
                ? 'bg-indigo-600/70 text-indigo-300 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] active:scale-[0.98]'
            }`}
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Zap size={16} />
                Procesar Venta Virtual
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
