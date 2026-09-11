'use client';

import React, { useState, useTransition, useMemo, useCallback } from 'react';
import {
  Search, Plus, Minus, Trash2, Zap, X, ShoppingCart, User, UserCircle, CreditCard, ChevronLeft, ChevronRight, CheckCircle, Receipt, Edit3, History, AlertCircle, Package, Loader2
} from 'lucide-react';
import HistorialVentas from '@/components/pos/HistorialVentas';
import { procesarVentaVirtual, MetodoPagoVirtual } from '@/actions/ventas-virtual-actions';
import type { ProductoPOS } from '@/actions/pos-actions';

interface ItemCarrito {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  precio_modificable?: boolean;
}

interface TerminalVirtualProps {
  catalogo: ProductoPOS[];
  sedeVirtualId: string;
  metodosDisponibles?: string[];
  tasaActiva?: number;
  empresaNombre?: string;
}

const METODOS_DEFAULT = ['Efectivo USD', 'Transferencia', 'Zelle', 'Pago Móvil', 'Punto de Venta'];

export default function TerminalVirtual({
  catalogo,
  sedeVirtualId,
  metodosDisponibles = METODOS_DEFAULT,
  tasaActiva = 1,
  empresaNombre = 'Mi Empresa',
}: TerminalVirtualProps) {
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Campos extras
  const [clienteNombre, setClienteNombre] = useState('');
  const [meseroNombre, setMeseroNombre] = useState('');

  // Modal de Pago
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [pagos, setPagos] = useState<{ tipo: string; montoStr: string }[]>([
    { tipo: metodosDisponibles[0] || 'Efectivo USD', montoStr: '' }
  ]);

  // Edición de precio inline
  const [editandoPrecioId, setEditandoPrecioId] = useState<string | null>(null);
  const [precioEditTemp, setPrecioEditTemp] = useState('');

  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras || '').toLowerCase().includes(q)
    );
  }, [catalogo, busqueda]);

  const total = useMemo(
    () => carrito.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0),
    [carrito]
  );
  const cantidadItems = carrito.reduce((acc, i) => acc + i.cantidad, 0);

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
          precio_modificable: prod.precio_modificable,
        },
      ];
    });
    setResultado(null);
  }, []);

  const cambiarCantidad = useCallback((producto_id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => (i.producto_id === producto_id ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    );
  }, []);

  const eliminarItem = useCallback((producto_id: string) => {
    setCarrito((prev) => prev.filter((i) => i.producto_id !== producto_id));
  }, []);

  const vaciarCarrito = () => {
    setCarrito([]);
    setResultado(null);
  };

  const guardarPrecioEditado = (id: string) => {
    const nuevo = parseFloat(precioEditTemp);
    if (!isNaN(nuevo) && nuevo >= 0) {
      setCarrito(prev => prev.map(i => i.producto_id === id ? { ...i, precio_unitario: nuevo } : i));
    }
    setEditandoPrecioId(null);
  };

  // ── Lógica Modal de Pago ───────────────────────────────────────────────────

  const abrirModalPago = () => {
    setPagos([{ tipo: metodosDisponibles[0] || 'Efectivo USD', montoStr: total.toFixed(2) }]);
    setModalPagoAbierto(true);
  };

  // Venta Exitosa Data
  const [ventaExitosa, setVentaExitosa] = useState<any>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  const totalPagado = pagos.reduce((acc, p) => acc + (parseFloat(p.montoStr) || 0), 0);
  const restante = Math.max(0, total - totalPagado);
  const vuelto = Math.max(0, totalPagado - total);

  const agregarLineaPago = () => {
    setPagos([...pagos, { tipo: metodosDisponibles[0] || 'Efectivo USD', montoStr: restante > 0 ? restante.toFixed(2) : '' }]);
  };

  const removerLineaPago = (index: number) => {
    setPagos(pagos.filter((_, i) => i !== index));
  };

  const actualizarLineaPago = (index: number, campo: 'tipo' | 'montoStr', valor: string) => {
    const n = [...pagos];
    n[index][campo] = valor;
    setPagos(n);
  };

  const handleProcesar = () => {
    if (restante > 0 && !clienteNombre.trim()) {
      alert("Si la orden no está pagada en su totalidad, debes ingresar el nombre del cliente para el crédito.");
      return;
    }

    startTransition(async () => {
      const pagosMap: MetodoPagoVirtual[] = pagos
        .map(p => ({ tipo_pago: p.tipo, monto: parseFloat(p.montoStr) || 0 }))
        .filter(p => p.monto > 0);

      let montoAjustar = vuelto;
      if (montoAjustar > 0) {
         for (let i = 0; i < pagosMap.length; i++) {
            if (pagosMap[i].monto >= montoAjustar) {
               pagosMap[i].monto -= montoAjustar;
               montoAjustar = 0;
               break;
            }
         }
      }

      const itemsParaVender = carrito.map((i) => ({
        producto_id: i.producto_id,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      }));

      const res = await procesarVentaVirtual({
        sede_id: sedeVirtualId,
        items: itemsParaVender,
        pagos: pagosMap,
        cliente_nombre: clienteNombre.trim() || undefined,
        mesero_nombre: meseroNombre.trim() || undefined,
      });

      if (res.success && res.factura) {
        setVentaExitosa({
           factura: res.factura,
           items: itemsParaVender,
           pagos: pagosMap,
           tasa: tasaActiva
        });
        setResultado({ ok: true, msg: `Venta registrada correctamente.` });
        setCarrito([]);
        setClienteNombre('');
        setMeseroNombre('');
        setModalPagoAbierto(false);
      } else {
        setResultado({ ok: false, msg: res.error || 'Error desconocido al procesar la venta.' });
      }
    });
  };

  const handleImprimirTicket = async () => {
    if (!ventaExitosa) return;
    try {
      const { generarTicketPOS } = await import('@/utils/pdf-generator');
      generarTicketPOS(ventaExitosa.factura, { nombre_comercial: empresaNombre }, ventaExitosa.items, ventaExitosa.pagos, ventaExitosa.tasa);
    } catch (e) {
      console.error("Error al generar ticket:", e);
      alert("Hubo un error al generar el ticket.");
    }
  };

  const handleNuevaVenta = () => {
    setVentaExitosa(null);
    setCarritoAbierto(false);
    setResultado(null);
  };


  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-200px)]">

      {/* ── Panel Izquierdo: Catálogo ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-indigo-400" />
            <h2 className="text-base font-bold text-white">Terminal Virtual</h2>
            <span className="text-xs px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full font-medium">
              {catalogo.length} productos
            </span>
          </div>

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

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
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
          <button 
             onClick={() => setHistorialAbierto(true)}
             className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors border border-neutral-700 whitespace-nowrap flex items-center gap-2"
          >
             <History size={18} /> <span className="hidden sm:inline">Historial</span>
          </button>
        </div>

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

        <div className="flex-1 overflow-y-auto">
          {catalogoFiltrado.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500 gap-3">
              <Package size={40} className="text-neutral-700" />
              <p className="text-sm">No hay resultados para tu búsqueda.</p>
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
                    {enCarrito && (
                      <span className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {enCarrito.cantidad}
                      </span>
                    )}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${
                      enCarrito ? 'bg-indigo-500/20' : 'bg-neutral-800 group-hover:bg-neutral-700'
                    }`}>
                      <Package size={16} className={enCarrito ? 'text-indigo-400' : 'text-neutral-400'} />
                    </div>
                    <span className={`text-xs font-semibold leading-tight line-clamp-2 ${
                      enCarrito ? 'text-indigo-300' : 'text-neutral-200'
                    }`}>
                      {prod.nombre}
                    </span>
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

      {/* ── Panel Derecho: Carrito ── */}
      {carritoAbierto && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setCarritoAbierto(false)}
        />
      )}

      <div
        className={`
          lg:w-[22rem] xl:w-96 flex flex-col gap-4
          bg-neutral-900 border border-neutral-800 rounded-2xl p-4
          lg:static lg:translate-x-0 lg:flex
          fixed right-0 top-0 bottom-0 w-80 z-50 overflow-y-auto
          transition-transform duration-300 ease-out
          ${carritoAbierto ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Orden Actual</h3>
            {cantidadItems > 0 && (
              <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full font-medium">
                {cantidadItems}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {carrito.length > 0 && (
              <button
                onClick={vaciarCarrito}
                className="text-xs text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Vaciar
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

        {/* Si hay una venta exitosa, mostrar pantalla de éxito, de lo contrario mostrar carrito normal */}
        {ventaExitosa ? (
           <div className="flex-1 flex flex-col items-center justify-center py-10 gap-6">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-full">
                 <CheckCircle size={32} />
              </div>
              <div className="text-center">
                 <h3 className="text-xl font-bold text-white mb-1">¡Venta Exitosa!</h3>
                 <p className="text-sm text-neutral-400">Documento: {ventaExitosa.factura.numero_documento}</p>
                 <p className="text-sm text-emerald-400 font-bold mt-1">Total: ${ventaExitosa.factura.total.toFixed(2)}</p>
              </div>

              <div className="flex flex-col gap-3 w-full mt-4">
                 <button 
                   onClick={handleImprimirTicket}
                   className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white transition-colors border border-neutral-700"
                 >
                    <Receipt size={16} /> Imprimir Recibo
                 </button>
                 <button 
                   onClick={handleNuevaVenta}
                   className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                 >
                    <Plus size={16} /> Nueva Venta
                 </button>
              </div>
           </div>
        ) : (
           <>
              {/* Cliente y Mesero */}
              <div className="flex flex-col gap-2 shrink-0 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
                 <div className="flex items-center gap-2">
                   <User size={14} className="text-neutral-500" />
                   <input 
                     type="text" 
                     placeholder="Nombre del Cliente (Opcional)" 
                     value={clienteNombre}
                     onChange={e => setClienteNombre(e.target.value)}
                     className="bg-transparent border-b border-neutral-800 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 w-full py-1"
                   />
                 </div>
                 <div className="flex items-center gap-2">
                   <UserCircle size={14} className="text-neutral-500" />
                   <input 
                     type="text" 
                     placeholder="Mesero / Vendedor (Opcional)" 
                     value={meseroNombre}
                     onChange={e => setMeseroNombre(e.target.value)}
                     className="bg-transparent border-b border-neutral-800 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 w-full py-1"
                   />
                 </div>
              </div>

              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {carrito.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-neutral-600 gap-2 h-full">
                    <ShoppingCart size={32} />
                    <p className="text-xs">Toca un producto para agregarlo</p>
                  </div>
                ) : (
                  carrito.map((item) => (
                    <div
                      key={item.producto_id}
                      className="flex items-center gap-3 bg-neutral-950/50 border border-neutral-800/50 rounded-xl p-3 relative group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-200 truncate pr-4">{item.nombre}</p>
                        
                        {editandoPrecioId === item.producto_id ? (
                           <div className="flex items-center gap-1 mt-1">
                             <span className="text-xs text-neutral-500">$</span>
                             <input 
                               type="number" 
                               autoFocus
                               className="bg-neutral-900 border border-indigo-500/50 rounded px-1 w-16 text-xs text-white outline-none"
                               value={precioEditTemp}
                               onChange={e => setPrecioEditTemp(e.target.value)}
                               onKeyDown={e => { if(e.key === 'Enter') guardarPrecioEditado(item.producto_id); }}
                               onBlur={() => guardarPrecioEditado(item.producto_id)}
                             />
                           </div>
                        ) : (
                           <div className="flex items-center gap-1">
                              <p className="text-xs text-emerald-400 font-medium">
                                ${Number(item.precio_unitario).toFixed(2)} c/u
                              </p>
                              {item.precio_modificable && (
                                 <button 
                                   onClick={() => { setEditandoPrecioId(item.producto_id); setPrecioEditTemp(item.precio_unitario.toString()); }}
                                   className="text-neutral-600 hover:text-indigo-400 p-0.5 transition-colors hidden group-hover:block"
                                   title="Editar precio"
                                 >
                                    <Edit3 size={10} />
                                 </button>
                              )}
                           </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => cambiarCantidad(item.producto_id, -1)}
                          className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-sm font-bold text-white w-5 text-center">{item.cantidad}</span>
                        <button
                          onClick={() => cambiarCantidad(item.producto_id, 1)}
                          className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 w-12">
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

              <div className="flex flex-col gap-3 shrink-0">
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                     <span className="text-xs text-indigo-300 uppercase font-bold tracking-wider">Total</span>
                     <span className="text-[10px] text-neutral-400">Tasa: Bs {tasaActiva.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-2xl font-black text-white">${total.toFixed(2)}</span>
                     <span className="text-sm font-semibold text-neutral-400">Bs {(total * tasaActiva).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={abrirModalPago}
                  disabled={carrito.length === 0}
                  className={`w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                    carrito.length === 0
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] active:scale-[0.98]'
                  }`}
                >
                  <CreditCard size={16} />
                  Pagar Orden
                </button>
              </div>
           </>
        )}
      </div>

      {/* ── Modal de Pago Avanzado ── */}
      {modalPagoAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setModalPagoAbierto(false)} />
           <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Receipt size={18} className="text-indigo-400" /> Procesar Pago
                 </h3>
                 <button onClick={() => setModalPagoAbierto(false)} className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors">
                    <X size={18} />
                 </button>
              </div>

              <div className="p-5 space-y-6">
                 {/* Resumen */}
                 <div className="flex items-center justify-between pb-4 border-b border-neutral-800/50">
                    <div>
                       <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Total a Pagar</p>
                       <p className="text-2xl font-black text-white">${total.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Equivalente</p>
                       <p className="text-lg font-bold text-neutral-400">Bs {(total * tasaActiva).toFixed(2)}</p>
                    </div>
                 </div>

                 {/* Lineas de pago */}
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Métodos de Pago</label>
                    </div>
                    
                    {pagos.map((pago, index) => (
                       <div key={index} className="flex items-center gap-2">
                          <select
                             value={pago.tipo}
                             onChange={e => actualizarLineaPago(index, 'tipo', e.target.value)}
                             className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                          >
                             {metodosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          
                          <div className="relative w-32 shrink-0">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                             <input 
                                type="number" 
                                value={pago.montoStr}
                                onChange={e => actualizarLineaPago(index, 'montoStr', e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                                placeholder="0.00"
                             />
                          </div>
                          
                          <button 
                             onClick={() => removerLineaPago(index)}
                             disabled={pagos.length === 1}
                             className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors disabled:opacity-30 shrink-0"
                          >
                             <Trash2 size={16} />
                          </button>
                       </div>
                    ))}

                    <button 
                       onClick={agregarLineaPago}
                       className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 py-1"
                    >
                       <Plus size={14} /> Añadir otro método
                    </button>
                 </div>

                 {/* Totales de pago y validación */}
                 <div className="bg-neutral-950/50 rounded-xl p-4 border border-neutral-800 space-y-2">
                    <div className="flex justify-between text-sm">
                       <span className="text-neutral-400">Total Recibido:</span>
                       <span className="font-bold text-white">${totalPagado.toFixed(2)}</span>
                    </div>
                    {restante > 0 && (
                       <div className="flex justify-between text-sm">
                          <span className="text-amber-400 font-medium">Falta por pagar (Crédito):</span>
                          <span className="font-bold text-amber-400">${restante.toFixed(2)}</span>
                       </div>
                    )}
                    {vuelto > 0 && (
                       <div className="flex justify-between text-sm">
                          <span className="text-emerald-400 font-medium">Vuelto a entregar:</span>
                          <span className="font-bold text-emerald-400">${vuelto.toFixed(2)}</span>
                       </div>
                    )}
                 </div>

              </div>

              <div className="p-4 border-t border-neutral-800 bg-neutral-950/50">
                 <button
                   onClick={handleProcesar}
                   disabled={isPending}
                   className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:opacity-50 transition-all"
                 >
                   {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                   {isPending ? 'Registrando...' : (restante > 0 ? 'Registrar Pago Parcial (Crédito)' : 'Confirmar Venta')}
                 </button>
              </div>

           </div>
        </div>
      )}

      {/* ── Modal de Historial de Ventas ── */}
      {historialAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><History size={24} className="text-indigo-400" /> Historial de Turno</h2>
              <button 
                onClick={() => setHistorialAbierto(false)}
                className="p-2 text-neutral-500 hover:text-white bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 bg-neutral-950">
               <HistorialVentas sedeId={sedeVirtualId} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
