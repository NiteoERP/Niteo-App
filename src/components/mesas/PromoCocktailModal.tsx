'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Wine, Plus, Minus, Check, Sparkles, Search, AlertCircle } from 'lucide-react';

export interface CocktailSelected {
  producto_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  catalogo: any[];
  promoProductoId?: string;
  onConfirmar: (item: {
    producto_id: string;
    nombre: string;
    precio_unitario: number;
    notas_preparacion: string[];
    comentario: string;
  }) => void;
}

// Lista oficial de nombres de cócteles permitidos en la barra
const NOMBRES_COCTELES = [
  'MOJITO CUBANO',
  'PIÑA COLADA',
  'MARGARITA BLUE',
  'TEQUILA SUNRISE',
  'DAIQUIRI',
  'CUBA LIBRE',
  'TINTO DE VERANO',
  'LAGUNA AZUL',
  'BUSCANDO A NEMO',
  'MICHELADA',
  'SANGRIA',
  'BUENA VIBRA',
  'COSMOPOLITAN',
  'PANTERA ROSA',
  'GRINCH'
];

const normalizar = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function PromoCocktailModal({ isOpen, onClose, catalogo, promoProductoId, onConfirmar }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    if (isOpen) {
      setSeleccionados({});
      setBusqueda('');
    }
  }, [isOpen]);

  // Filtrar cócteles elegibles del catálogo
  const coctelesElegibles = useMemo(() => {
    return catalogo.filter((p) => {
      const nombreNorm = (p.nombre || '').toUpperCase().trim();
      // Excluir promos o sangrías gigantes/latas
      if (nombreNorm.includes('PROMO') || nombreNorm.includes('GRANDE') || nombreNorm.includes('LATA')) {
        return false;
      }
      return NOMBRES_COCTELES.some((nc) => nombreNorm.includes(nc));
    });
  }, [catalogo]);

  const coctelesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return coctelesElegibles;
    const qNorm = normalizar(q);
    return coctelesElegibles.filter((c) => {
      const nom = (c.nombre || '').toLowerCase();
      return nom.includes(q) || normalizar(nom).includes(qNorm);
    });
  }, [coctelesElegibles, busqueda]);

  const totalSeleccionado = useMemo(() => {
    return Object.values(seleccionados).reduce((sum, cant) => sum + cant, 0);
  }, [seleccionados]);

  // Lista aplanada de precios de los seleccionados para calcular regla 2x1 (COBRAR_MAYOR)
  const { precioFinal, ahorro } = useMemo(() => {
    const items: { id: string; nombre: string; precio: number }[] = [];
    Object.entries(seleccionados).forEach(([id, cant]) => {
      const prod = coctelesElegibles.find((c) => (c.id || c.producto_id) === id);
      if (prod && cant > 0) {
        for (let k = 0; k < cant; k++) {
          items.push({ id: prod.id || prod.producto_id, nombre: prod.nombre, precio: Number(prod.precio_venta || 0) });
        }
      }
    });

    items.sort((a, b) => b.precio - a.precio);
    const sumaTotal = items.reduce((acc, i) => acc + i.precio, 0);
    const mayor = items[0] ? items[0].precio : 0;
    const desc = Math.max(0, sumaTotal - mayor);

    return {
      precioFinal: mayor,
      ahorro: desc,
    };
  }, [seleccionados, coctelesElegibles]);

  const handleAgregar = (id: string) => {
    if (totalSeleccionado >= 2) return;
    setSeleccionados((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const handleQuitar = (id: string) => {
    setSeleccionados((prev) => {
      const actual = prev[id] || 0;
      if (actual <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: actual - 1 };
    });
  };

  const handleConfirmar = () => {
    if (totalSeleccionado !== 2) return;

    // Resumen de los 2 cócteles para nombre y notas de comanda
    const notas: string[] = [];
    const resumenNombres: string[] = [];

    Object.entries(seleccionados).forEach(([id, cant]) => {
      const prod = coctelesElegibles.find((c) => (c.id || c.producto_id) === id);
      if (prod && cant > 0) {
        const str = `${cant > 1 ? `${cant}x ` : '1x '}${prod.nombre}`;
        notas.push(str);
        resumenNombres.push(str);
      }
    });

    onConfirmar({
      producto_id: promoProductoId || `promo-2x1-${Date.now()}`,
      nombre: `Promo Cócteles 2x1 (${resumenNombres.join(' + ')})`,
      precio_unitario: precioFinal,
      notas_preparacion: notas,
      comentario: notas.join(', ')
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900/70 via-purple-900/50 to-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <Wine size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Promo Cócteles 2x1</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles size={11} /> 2x1
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Escoge 2 cócteles. Se cobra únicamente el de mayor precio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de progreso / Estado de selección */}
        <div className="px-4 py-3 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs sm:text-sm font-semibold text-neutral-300">Cócteles:</span>
            <div className="flex items-center gap-1.5">
              {[0, 1].map((idx) => {
                const filled = idx < totalSeleccionado;
                return (
                  <div
                    key={idx}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      filled
                        ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                        : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                    }`}
                  >
                    {filled ? <Check size={13} /> : idx + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {totalSeleccionado === 2 ? (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block">Total:</span>
                <span className="text-base sm:text-lg font-black text-emerald-400">${precioFinal.toFixed(2)}</span>
              </div>
              {ahorro > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full">
                  ¡Ahorro ${ahorro.toFixed(2)}!
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
              <AlertCircle size={13} /> Elige {2 - totalSeleccionado} más
            </span>
          )}
        </div>

        {/* Buscador dentro del modal */}
        <div className="px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar cóctel (Mojito, Piña Colada, Margarita...)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-10 bg-neutral-950 border border-neutral-800 text-xs sm:text-sm text-white rounded-xl pl-9 pr-3 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* Lista de Cócteles */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {coctelesFiltrados.map((c) => {
            const cid = c.id || c.producto_id;
            const cant = seleccionados[cid] || 0;
            const precio = Number(c.precio_venta || 0);

            return (
              <div
                key={cid}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                  cant > 0
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md shadow-indigo-500/10'
                    : 'bg-neutral-850/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex-1 pr-2 min-w-0">
                  <h4 className="font-bold text-white text-xs sm:text-sm truncate">{c.nombre}</h4>
                  <span className="text-xs font-semibold text-neutral-400">
                    ${precio.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {cant > 0 && (
                    <button
                      onClick={() => handleQuitar(cid)}
                      className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors active:scale-95"
                    >
                      <Minus size={15} />
                    </button>
                  )}

                  {cant > 0 && (
                    <span className="w-6 text-center font-black text-indigo-400 text-sm">
                      {cant}
                    </span>
                  )}

                  <button
                    onClick={() => handleAgregar(cid)}
                    disabled={totalSeleccionado >= 2}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${
                      totalSeleccionado >= 2
                        ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed opacity-40'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    }`}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-neutral-950/90 border-t border-neutral-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl font-bold transition-colors text-xs sm:text-sm"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmar}
            disabled={totalSeleccionado !== 2}
            className="flex-1 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.99]"
          >
            <Check size={16} />
            {totalSeleccionado === 2
              ? `Confirmar Promo 2x1 ($${precioFinal.toFixed(2)})`
              : `Selecciona 2 Cócteles (${totalSeleccionado}/2)`}
          </button>
        </div>
      </div>
    </div>
  );
}
