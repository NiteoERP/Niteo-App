'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { HistorialVentaPOS, VentaPOS, ProductoPOS, getProductosCatalogoVirtual, modificarVentaPOS } from '@/actions/pos-actions';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import { 
  X, Trash2, Plus, Minus, AlertCircle, DollarSign, 
  Receipt, Edit3, ShieldAlert, Check, Loader2, ArrowRight, Sparkles 
} from 'lucide-react';
import { getCanonicalPaymentMethodName } from '@/utils/payment-methods';

interface EditarVentaModalProps {
  venta: HistorialVentaPOS | VentaPOS | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedVentaId: string) => void;
}

interface ItemEditable {
  id_detalle?: string;
  producto_id: string;
  producto_nombre: string;
  producto_codigo?: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  notas?: string;
  combo_items?: any[];
  isNew?: boolean;
}

interface PagoEditable {
  id?: string;
  tipo_pago: string;
  monto: number;
  moneda?: string;
}

const METODOS_PAGO_COMUNES = [
  'Pago Móvil',
  'Cashea',
  'Efectivo USD',
  'Efectivo Bs',
  'Punto de Venta',
  'Zelle',
  'Transferencia',
  'Cortesía'
];

export default function EditarVentaModal({ venta, isOpen, onClose, onSuccess }: EditarVentaModalProps) {
  const { empresaId, userRole } = useEmpresa();

  const [items, setItems] = useState<ItemEditable[]>([]);
  const [pagos, setPagos] = useState<PagoEditable[]>([]);
  const [descuento, setDescuento] = useState<number>(0);
  const [propina, setPropina] = useState<number>(0);
  const [motivo, setMotivo] = useState('');
  const [catalogo, setCatalogo] = useState<ProductoPOS[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoPOS | null>(null);
  const [cantidadNuevo, setCantidadNuevo] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Inicializar estado con datos de la venta al abrir
  useEffect(() => {
    if (venta && isOpen) {
      setItems(
        (venta.detalles || []).map(d => ({
          id_detalle: d.id_detalle,
          producto_id: d.producto_id,
          producto_nombre: d.producto_nombre || 'Producto',
          producto_codigo: d.producto_codigo,
          cantidad: Number(d.cantidad) || 1,
          precio_unitario: Number(d.precio_unitario) || 0,
          total: Number(d.total) || 0,
          combo_items: d.combo_items,
          isNew: false
        }))
      );

      setPagos(
        (venta.pagos || []).map((p, idx) => ({
          id: `pago-${idx}`,
          tipo_pago: p.tipo_pago,
          monto: Number(p.monto) || 0,
          moneda: 'USD'
        }))
      );

      setDescuento(Number(venta.descuento) || 0);
      setPropina(Number(venta.propina) || 0);
      setMotivo('');
      setErrorMsg('');
      setBusquedaProducto('');
      setProductoSeleccionado(null);
      setCantidadNuevo(1);
    }
  }, [venta, isOpen]);

  // Cargar catálogo de productos si no está cargado
  useEffect(() => {
    if (isOpen && empresaId && catalogo.length === 0) {
      setLoadingCatalogo(true);
      getProductosCatalogoVirtual(empresaId)
        .then(prods => setCatalogo(prods))
        .catch(err => console.error('Error cargando catálogo:', err))
        .finally(() => setLoadingCatalogo(false));
    }
  }, [isOpen, empresaId, catalogo.length]);

  // Cálculos matemáticos
  const subtotalItems = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }, [items]);

  const totalCalculado = useMemo(() => {
    const tot = subtotalItems - Number(descuento || 0) + Number(propina || 0);
    return Math.max(0, Math.round(tot * 100) / 100);
  }, [subtotalItems, descuento, propina]);

  const totalPagos = useMemo(() => {
    const tp = pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
    return Math.round(tp * 100) / 100;
  }, [pagos]);

  const diferenciaPagos = useMemo(() => {
    return Math.round((totalPagos - totalCalculado) * 100) / 100;
  }, [totalPagos, totalCalculado]);

  // Manejo de productos en la orden
  const handleCambiarCantidadItem = (index: number, delta: number) => {
    setItems(prev => {
      const next = [...prev];
      const actual = next[index];
      const nuevaCantidad = Math.max(1, actual.cantidad + delta);
      const nuevoTotal = Math.round(nuevaCantidad * actual.precio_unitario * 100) / 100;
      next[index] = { ...actual, cantidad: nuevaCantidad, total: nuevoTotal };
      return next;
    });
  };

  const handleSetCantidadItem = (index: number, val: number) => {
    const cant = Math.max(1, isNaN(val) ? 1 : val);
    setItems(prev => {
      const next = [...prev];
      const actual = next[index];
      const nuevoTotal = Math.round(cant * actual.precio_unitario * 100) / 100;
      next[index] = { ...actual, cantidad: cant, total: nuevoTotal };
      return next;
    });
  };

  const handleEliminarItem = (index: number) => {
    if (items.length <= 1) {
      alert('La orden debe contener al menos un producto.');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAgregarProducto = () => {
    if (!productoSeleccionado) return;
    const precio = Number(productoSeleccionado.precio_venta) || 0;
    const cant = Math.max(1, Number(cantidadNuevo) || 1);
    const tot = Math.round(precio * cant * 100) / 100;

    // Si ya existe en la lista, sumar cantidad
    const existenteIdx = items.findIndex(it => it.producto_id === productoSeleccionado.producto_id);
    if (existenteIdx !== -1) {
      handleCambiarCantidadItem(existenteIdx, cant);
    } else {
      setItems(prev => [
        ...prev,
        {
          producto_id: productoSeleccionado.producto_id,
          producto_nombre: productoSeleccionado.nombre,
          producto_codigo: productoSeleccionado.codigo_barras,
          cantidad: cant,
          precio_unitario: precio,
          total: tot,
          isNew: true
        }
      ]);
    }

    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setCantidadNuevo(1);
  };

  // Manejo de métodos de pago
  const handleCambiarMontoPago = (index: number, monto: number) => {
    setPagos(prev => {
      const next = [...prev];
      next[index] = { ...next[index], monto: Math.max(0, isNaN(monto) ? 0 : monto) };
      return next;
    });
  };

  const handleCambiarMetodoPago = (index: number, tipo: string) => {
    setPagos(prev => {
      const next = [...prev];
      next[index] = { ...next[index], tipo_pago: tipo };
      return next;
    });
  };

  const handleEliminarPago = (index: number) => {
    if (pagos.length <= 1) {
      alert('Debe haber al menos un método de pago.');
      return;
    }
    setPagos(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAgregarPago = () => {
    const restante = Math.max(0, Math.round((totalCalculado - totalPagos) * 100) / 100);
    setPagos(prev => [
      ...prev,
      {
        id: `pago-${Date.now()}`,
        tipo_pago: 'Pago Móvil',
        monto: restante,
        moneda: 'USD'
      }
    ]);
  };

  // Botón inteligente: Ajustar pagos al total
  const handleAutoAjustarPagos = () => {
    if (pagos.length === 0) {
      setPagos([{ id: `pago-${Date.now()}`, tipo_pago: 'Pago Móvil', monto: totalCalculado, moneda: 'USD' }]);
      return;
    }

    if (pagos.length === 1) {
      setPagos([{ ...pagos[0], monto: totalCalculado }]);
      return;
    }

    // Si hay más de un pago (como Cashea + Pago Móvil), ajustamos el último pago con el saldo restante
    const otrosPagosSum = pagos.slice(0, -1).reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
    const nuevoUltimoMonto = Math.max(0, Math.round((totalCalculado - otrosPagosSum) * 100) / 100);

    setPagos(prev => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], monto: nuevoUltimoMonto };
      return next;
    });
  };

  // Resumen visual de cambios antes de confirmar
  const cambiosPreview = useMemo(() => {
    if (!venta) return [];
    const lista: string[] = [];
    const origDetalles = venta.detalles || [];
    const origMap = new Map(origDetalles.map(d => [d.id_detalle, d]));

    // Detectar eliminados
    origDetalles.forEach(od => {
      const exists = items.some(it => it.id_detalle === od.id_detalle);
      if (!exists) {
        lista.push(`❌ Se eliminará: ${od.cantidad}x ${od.producto_nombre || 'Producto'} ($${Number(od.total).toFixed(2)})`);
      }
    });

    // Detectar agregados y modificados
    items.forEach(it => {
      if (it.isNew || !it.id_detalle) {
        lista.push(`➕ Se agregará: ${it.cantidad}x ${it.producto_nombre} ($${it.total.toFixed(2)})`);
      } else {
        const od = origMap.get(it.id_detalle);
        if (od && (od.cantidad !== it.cantidad || od.total !== it.total)) {
          lista.push(`✏️ Modificado: ${it.producto_nombre} (${od.cantidad}x ➔ ${it.cantidad}x)`);
        }
      }
    });

    if (Number(venta.total) !== totalCalculado) {
      lista.push(`💰 Total ajustado: $${Number(venta.total).toFixed(2)} ➔ $${totalCalculado.toFixed(2)} USD`);
    }

    return lista;
  }, [venta, items, totalCalculado]);

  // Guardar modificación
  const handleGuardar = async () => {
    setErrorMsg('');

    if (!motivo.trim()) {
      setErrorMsg('Debes ingresar el motivo de la modificación para el registro de auditoría.');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('El pedido debe tener al menos un producto.');
      return;
    }

    if (Math.abs(diferenciaPagos) > 0.01) {
      setErrorMsg(`Los pagos ($${totalPagos.toFixed(2)}) no coinciden con el total ($${totalCalculado.toFixed(2)}). Haz clic en "Ajustar al total" para balancear.`);
      return;
    }

    setGuardando(true);
    try {
      const res = await modificarVentaPOS({
        facturaId: venta!.id_factura,
        motivo: motivo.trim(),
        detalles: items.map(it => ({
          id_detalle: it.id_detalle,
          producto_id: it.producto_id,
          producto_nombre: it.producto_nombre,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          total: it.total,
          notas: it.notas,
          combo_items: it.combo_items
        })),
        pagos: pagos.map(p => ({
          tipo_pago: p.tipo_pago,
          monto: p.monto,
          moneda: p.moneda || 'USD'
        })),
        descuento: Number(descuento) || 0,
        propina: Number(propina) || 0
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Ocurrió un error al modificar la venta.');
        setGuardando(false);
        return;
      }

      onSuccess(venta!.id_factura);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Error inesperado');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen || !venta) return null;

  const catalogoFiltrado = catalogo.filter(p => {
    if (!busquedaProducto.trim()) return false;
    const b = busquedaProducto.toLowerCase();
    return p.nombre.toLowerCase().includes(b) || (p.codigo_barras && p.codigo_barras.toLowerCase().includes(b));
  }).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Edit3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Modificar Pedido {venta.numero_documento}
                </h3>
                <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                  {venta.numero_orden || 'Venta POS'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Cajero: <strong className="text-neutral-200">{venta.cajero_nombre || 'N/A'}</strong> • Cliente: <strong className="text-neutral-200">{venta.cliente_nombre || 'General'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-neutral-200 text-sm">

          {/* Banner de Autorización */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-300">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-blue-400" />
            <div>
              <p className="font-semibold text-blue-200">Acción de Gerencia y Control de Auditoría</p>
              <p className="text-blue-300/80 mt-0.5">
                Esta modificación actualizará la venta original, ajustará el inventario según los productos modificados y guardará un registro inmutable con tu usuario (<strong className="text-white">{userRole}</strong>).
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. SECCIÓN: PRODUCTOS DE LA ORDEN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt size={14} className="text-indigo-400" />
                Productos de la Orden ({items.length})
              </h4>
              <span className="text-xs font-mono text-neutral-400">
                Subtotal items: <strong className="text-emerald-400">${subtotalItems.toFixed(2)}</strong>
              </span>
            </div>

            <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl divide-y divide-neutral-800/80 overflow-hidden">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-900/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">{it.producto_nombre}</span>
                      {it.isNew && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      ${it.precio_unitario.toFixed(2)} c/u
                    </p>
                  </div>

                  {/* Selector de Cantidad */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleCambiarCantidadItem(idx, -1)}
                        className="px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={it.cantidad}
                        onChange={(e) => handleSetCantidadItem(idx, parseInt(e.target.value) || 1)}
                        className="w-12 text-center bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleCambiarCantidadItem(idx, 1)}
                        className="px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm w-20 text-right">
                      ${it.total.toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleEliminarItem(idx)}
                      className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Agregar producto del catálogo */}
            <div className="bg-neutral-950/40 border border-dashed border-neutral-800 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                <Plus size={13} className="text-indigo-400" /> Agregar producto adicional al pedido
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2 relative">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={busquedaProducto}
                    onChange={(e) => {
                      setBusquedaProducto(e.target.value);
                      setProductoSeleccionado(null);
                    }}
                    placeholder="Buscar producto por nombre o código..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />

                  {/* Dropdown de búsqueda */}
                  {busquedaProducto.trim().length > 1 && !productoSeleccionado && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-neutral-800">
                      {loadingCatalogo ? (
                        <div className="p-3 text-center text-xs text-neutral-500">Cargando catálogo...</div>
                      ) : catalogoFiltrado.length > 0 ? (
                        catalogoFiltrado.map(prod => (
                          <button
                            key={prod.producto_id}
                            type="button"
                            onClick={() => {
                              setProductoSeleccionado(prod);
                              setBusquedaProducto(`${prod.nombre} ($${prod.precio_venta.toFixed(2)})`);
                            }}
                            className="w-full text-left p-2.5 hover:bg-neutral-800 flex justify-between items-center text-xs transition-colors"
                          >
                            <span className="font-medium text-white truncate">{prod.nombre}</span>
                            <span className="font-mono text-emerald-400 shrink-0 font-bold">${prod.precio_venta.toFixed(2)}</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-neutral-500">No se encontraron productos</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden px-2 py-1">
                    <span className="text-[11px] text-neutral-400 mr-2">Cant:</span>
                    <input
                      type="number"
                      min="1"
                      value={cantidadNuevo}
                      onChange={(e) => setCantidadNuevo(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAgregarProducto}
                    disabled={!productoSeleccionado}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SECCIÓN: TOTALES Y DESCUENTOS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-950/70 p-4 rounded-xl border border-neutral-800">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Descuento ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={descuento}
                onChange={(e) => setDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Propina ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={propina}
                onChange={(e) => setPropina(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex flex-col justify-end text-right">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Nuevo Total Orden
              </span>
              <span className="text-xl font-extrabold font-mono text-emerald-400">
                ${totalCalculado.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* 3. SECCIÓN: MÉTODOS DE PAGO Y SALDOS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-400" />
                Desglose de Pago (${totalPagos.toFixed(2)})
              </h4>

              {/* Botón de Auto-Ajustar al Total */}
              {Math.abs(diferenciaPagos) > 0.001 && (
                <button
                  type="button"
                  onClick={handleAutoAjustarPagos}
                  className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl transition-colors font-semibold flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Sparkles size={13} />
                  <span>Ajustar pagos para cuadrar exacto a ${totalCalculado.toFixed(2)}</span>
                </button>
              )}
            </div>

            <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl divide-y divide-neutral-800/80 overflow-hidden">
              {pagos.map((p, idx) => (
                <div key={p.id || idx} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={p.tipo_pago}
                      onChange={(e) => handleCambiarMetodoPago(idx, e.target.value)}
                      className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {METODOS_PAGO_COMUNES.map(m => (
                        <option key={m} value={m}>{getCanonicalPaymentMethodName(m)}</option>
                      ))}
                      {!METODOS_PAGO_COMUNES.includes(p.tipo_pago) && (
                        <option value={p.tipo_pago}>{p.tipo_pago}</option>
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-neutral-400 font-mono">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={p.monto}
                      onChange={(e) => handleCambiarMontoPago(idx, parseFloat(e.target.value) || 0)}
                      className="w-28 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 text-right"
                    />

                    <button
                      type="button"
                      onClick={() => handleEliminarPago(idx)}
                      className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar método de pago"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleAgregarPago}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                <Plus size={13} /> Agregar otro método de pago
              </button>

              <div className="flex items-center gap-2">
                {Math.abs(diferenciaPagos) <= 0.001 ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check size={14} /> Pagos cuadrados al 100%
                  </span>
                ) : diferenciaPagos > 0 ? (
                  <span className="text-amber-400 font-semibold">
                    Diferencia: +${diferenciaPagos.toFixed(2)} (Pagos superan el total)
                  </span>
                ) : (
                  <span className="text-red-400 font-semibold">
                    Diferencia: -${Math.abs(diferenciaPagos).toFixed(2)} (Falta cubrir saldo)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. SECCIÓN: MOTIVO DE AUDITORÍA (OBLIGATORIO) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Motivo de la Modificación</span>
              <span className="text-red-400 text-xs">* (Obligatorio para auditoría)</span>
            </label>
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Se corrigió producto marcado por error del cajero y se ajustó el pago exacto cobrado al cliente..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 5. SECCIÓN: RESUMEN DE CAMBIOS QUE SE REGISTRARÁN */}
          {cambiosPreview.length > 0 && (
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 space-y-2">
              <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Resumen de Cambios a Registrar
              </h5>
              <div className="space-y-1">
                {cambiosPreview.map((c, i) => (
                  <p key={i} className="text-xs text-neutral-300 flex items-center gap-1.5 font-medium">
                    {c}
                  </p>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || !motivo.trim() || Math.abs(diferenciaPagos) > 0.01}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {guardando ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Guardando y Auditando...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Confirmar y Guardar Modificación</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
