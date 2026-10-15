'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Sparkles, Wine, Search, Plus, Minus, Check, AlertCircle, ShoppingCart, Info, Flame 
} from 'lucide-react';
import type { PromocionCombo } from '@/actions/promociones-actions';
import type { ProductoPOS } from '@/actions/pos-actions';

export interface ItemSeleccionadoPromo {
  producto_id: string;
  nombre: string;
  precio_original: number;
  cantidad: number;
}

export interface PromoBundleResult {
  promo_id: string;
  promo_nombre: string;
  producto_id: string;
  precio_unitario: number;
  total: number;
  items_seleccionados: ItemSeleccionadoPromo[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  promo: PromocionCombo | null;
  catalogo: ProductoPOS[];
  onConfirmar: (bundle: PromoBundleResult) => void;
}

export default function PromoSelectionModal({
  isOpen,
  onClose,
  promo,
  catalogo,
  onConfirmar,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<ItemSeleccionadoPromo[]>([]);

  // Reset al abrir o cambiar de promo
  useEffect(() => {
    if (isOpen) {
      setSeleccionados([]);
      setBusqueda('');
    }
  }, [isOpen, promo?.id]);

  if (!isOpen || !promo) return null;

  const cantidadTotalRequerida = promo.config_seleccion?.cantidad_total || 2;
  const primerGrupo = promo.config_seleccion?.grupos?.[0];
  const categoriaFiltroId = primerGrupo?.categoria_id;

  // Filtrar catálogo por categoría de la promo y por búsqueda
  const productosElegibles = useMemo(() => {
    let list = catalogo;
    if (categoriaFiltroId) {
      const matchCat = catalogo.filter((p) => p.categoria_id === categoriaFiltroId);
      // Si hay productos en esa categoría, los usamos. Si no, usamos todo el catálogo como fallback seguro
      if (matchCat.length > 0) {
        list = matchCat;
      }
    }

    const q = busqueda.trim().toLowerCase();
    if (!q) return list;
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const qNorm = norm(q);
    return list.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        norm(p.nombre).includes(qNorm) ||
        (p.codigo_barras || '').toLowerCase().includes(q)
    );
  }, [catalogo, categoriaFiltroId, busqueda]);

  const totalItemsSeleccionados = useMemo(
    () => seleccionados.reduce((acc, i) => acc + i.cantidad, 0),
    [seleccionados]
  );

  const faltanItems = cantidadTotalRequerida - totalItemsSeleccionados;
  const limiteAlcanzado = totalItemsSeleccionados >= cantidadTotalRequerida;

  // Lógica de cálculo dinámico del precio
  const { precioFinal, ahorroCalculado, mayorPrecio, itemsExpandidos } = useMemo(() => {
    // Aplanar los seleccionados (ej: 2 del mismo trago se convierten en [8, 8])
    const listaPrecios: number[] = [];
    const expandidos: { nombre: string; precio: number }[] = [];

    seleccionados.forEach((item) => {
      for (let k = 0; k < item.cantidad; k++) {
        listaPrecios.push(item.precio_original);
        expandidos.push({ nombre: item.nombre, precio: item.precio_original });
      }
    });

    // Ordenar de mayor a menor precio
    listaPrecios.sort((a, b) => b - a);

    const sumaTotalOriginal = listaPrecios.reduce((acc, p) => acc + p, 0);
    const mayor = listaPrecios[0] || 0;

    let final = 0;
    if (promo.regla_precio === 'COBRAR_MAYOR') {
      // Para un 2x1 cobra el mayor; si son más, cobra la cantidad configurada en cobrar_cantidad
      const cobrarCant = promo.config_seleccion?.cobrar_cantidad || 1;
      final = listaPrecios.slice(0, cobrarCant).reduce((acc, p) => acc + p, 0);
    } else if (promo.regla_precio === 'COBRAR_MENOR') {
      const menor = listaPrecios[listaPrecios.length - 1] || 0;
      final = menor;
    } else if (promo.regla_precio === 'PRECIO_FIJO') {
      final = promo.precio_fijo || 0;
    } else if (promo.regla_precio === 'DESCUENTO_PCT') {
      final = sumaTotalOriginal * (1 - (promo.descuento_porcentaje || 0) / 100);
    } else {
      final = mayor;
    }

    const ahorro = Math.max(0, sumaTotalOriginal - final);

    return {
      precioFinal: final,
      ahorroCalculado: ahorro,
      mayorPrecio: mayor,
      itemsExpandidos: expandidos,
    };
  }, [seleccionados, promo]);

  const agregarProducto = (prod: ProductoPOS) => {
    if (limiteAlcanzado) return;

    setSeleccionados((prev) => {
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
          precio_original: prod.precio_venta,
          cantidad: 1,
        },
      ];
    });
  };

  const quitarProducto = (producto_id: string) => {
    setSeleccionados((prev) =>
      prev
        .map((i) =>
          i.producto_id === producto_id ? { ...i, cantidad: i.cantidad - 1 } : i
        )
        .filter((i) => i.cantidad > 0)
    );
  };

  const removerCompletamente = (producto_id: string) => {
    setSeleccionados((prev) => prev.filter((i) => i.producto_id !== producto_id));
  };

  const handleConfirmar = () => {
    if (!limiteAlcanzado) return;

    onConfirmar({
      promo_id: promo.id,
      promo_nombre: promo.nombre,
      producto_id: promo.producto_id || 'PROMO-' + promo.id,
      precio_unitario: precioFinal,
      total: precioFinal,
      items_seleccionados: seleccionados,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabecera Niteo Premium */}
        <div className="px-5 py-4 border-b border-neutral-800/80 bg-neutral-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Wine size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {cantidadTotalRequerida}x{promo.config_seleccion?.cobrar_cantidad || 1}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {promo.nombre}
                </h3>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {promo.descripcion || `Escoge exactamente ${cantidadTotalRequerida} ítems para aplicar la promoción`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Slots / Progreso de Selección */}
        <div className="px-5 py-3.5 bg-neutral-950/40 border-b border-neutral-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400">
              Seleccionados:
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                limiteAlcanzado
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {totalItemsSeleccionados} de {cantidadTotalRequerida}
            </span>
            {faltanItems > 0 && (
              <span className="text-xs text-neutral-500">
                (Elige {faltanItems} más)
              </span>
            )}
          </div>

          {/* Slots visuales */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {Array.from({ length: cantidadTotalRequerida }).map((_, idx) => {
              const itemSlot = itemsExpandidos[idx];
              return (
                <div
                  key={idx}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 shrink-0 transition-all ${
                    itemSlot
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200'
                      : 'bg-neutral-950/60 border-dashed border-neutral-800 text-neutral-500'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-neutral-800 text-[10px] flex items-center justify-center font-bold text-neutral-300">
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[120px]">
                    {itemSlot ? itemSlot.nombre : 'Por escoger'}
                  </span>
                  {itemSlot && (
                    <span className="text-neutral-400 font-mono text-[11px]">
                      ${itemSlot.precio.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Buscador de Productos */}
        <div className="px-5 py-3 border-b border-neutral-800/40 bg-neutral-900/50">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cóctel o producto por nombre..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-all"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Grid de Productos Elegibles */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {productosElegibles.length === 0 ? (
            <div className="col-span-full py-12 text-center text-neutral-500 text-sm">
              No se encontraron productos elegibles con esa búsqueda.
            </div>
          ) : (
            productosElegibles.map((prod) => {
              const itemSel = seleccionados.find((i) => i.producto_id === prod.producto_id);
              const cantSel = itemSel ? itemSel.cantidad : 0;
              const disabledAdd = limiteAlcanzado;

              return (
                <div
                  key={prod.producto_id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    cantSel > 0
                      ? 'bg-indigo-950/20 border-indigo-500/50 shadow-sm shadow-indigo-500/10'
                      : 'bg-neutral-950/50 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-white text-xs sm:text-sm leading-snug line-clamp-2">
                      {prod.nombre}
                    </span>
                    <span className="font-mono text-indigo-400 font-bold text-xs sm:text-sm shrink-0">
                      ${prod.precio_venta.toFixed(2)}
                    </span>
                  </div>

                  {/* Controles de Selección */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/40">
                    <span className="text-[11px] text-neutral-500">
                      {cantSel > 0 ? `${cantSel} seleccionado(s)` : 'Disponible'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {cantSel > 0 && (
                        <button
                          type="button"
                          onClick={() => quitarProducto(prod.producto_id)}
                          className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => agregarProducto(prod)}
                        disabled={disabledAdd}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          disabledAdd
                            ? 'bg-neutral-800/50 text-neutral-600 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
                        }`}
                      >
                        <Plus size={12} />
                        {cantSel > 0 ? 'Añadir +' : 'Elegir'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resumen de Precios y Botón de Confirmación */}
        <div className="px-5 py-4 border-t border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                Total de la Promo:
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-white font-mono">
                  ${precioFinal.toFixed(2)}
                </span>
                <span className="text-xs text-neutral-400">USD</span>
              </div>
            </div>

            {ahorroCalculado > 0 && limiteAlcanzado && (
              <div className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Flame size={14} className="text-emerald-400" />
                <span>¡Ahorras ${ahorroCalculado.toFixed(2)}!</span>
                <span className="text-[10px] text-emerald-400/80 font-normal">
                  (Cobra el de mayor precio)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs sm:text-sm font-medium transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmar}
              disabled={!limiteAlcanzado}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                limiteAlcanzado
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Check size={16} />
              {limiteAlcanzado
                ? 'Confirmar y Agregar a la Venta'
                : `Falta seleccionar ${faltanItems} producto(s)`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
