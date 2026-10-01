'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, 
  Plus, 
  Search, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  Calendar, 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  X, 
  Info,
  Layers,
  ArrowDownCircle,
  FileSpreadsheet,
  UtensilsCrossed,
  ChefHat,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { 
  registrarMermaInsumo, 
  registrarMermaProductoAction,
  fetchRecetaProductoAction,
  revertirMermaInsumo, 
  MermaItem,
  IngredienteRecetaItem 
} from '@/actions/mermas-actions';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface MermasManagerProps {
  initialMermas: MermaItem[];
  insumos: any[];
  productos?: any[];
  reasons: any[];
  empresaId: string;
  activeSedeId: string;
  canSeeCosts?: boolean;
}

export default function MermasManager({
  initialMermas,
  insumos,
  productos = [],
  reasons,
  empresaId,
  activeSedeId,
  canSeeCosts = true
}: MermasManagerProps) {
  const [mermas, setMermas] = useState<MermaItem[]>(initialMermas);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReasonFilter, setSelectedReasonFilter] = useState('');
  
  // Modal de registro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tipoMerma, setTipoMerma] = useState<'PRODUCTO' | 'INSUMO'>('PRODUCTO');

  // Estado para Merma de Insumo individual
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadInsumoStr, setCantidadInsumoStr] = useState('');

  // Estado para Merma de Producto completo (Receta)
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [cantidadProductoStr, setCantidadProductoStr] = useState('1');
  const [recetaItems, setRecetaItems] = useState<IngredienteRecetaItem[]>([]);
  const [isLoadingReceta, setIsLoadingReceta] = useState(false);
  const [hasRecipe, setHasRecipe] = useState(false);
  const [guardarReceta, setGuardarReceta] = useState(true);

  // Insumo temporal para agregar a receta al vuelo si el producto no tiene
  const [tempInsumoId, setTempInsumoId] = useState('');
  const [tempCantidadStr, setTempCantidadStr] = useState('');

  // Motivo y notas generales
  const [selectedReasonId, setSelectedReasonId] = useState(reasons[0]?.id || '');
  const [notes, setNotes] = useState('');
  
  // Estados de carga y mensajes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Insumo seleccionado en modo individual
  const selectedInsumo = useMemo(() => {
    return insumos.find(i => i.id === selectedInsumoId);
  }, [insumos, selectedInsumoId]);

  // Producto seleccionado en modo producto
  const selectedProducto = useMemo(() => {
    return productos.find(p => p.id === selectedProductoId);
  }, [productos, selectedProductoId]);

  // Cuando cambia el producto seleccionado, cargar su receta
  useEffect(() => {
    if (tipoMerma === 'PRODUCTO' && selectedProductoId) {
      cargarReceta(selectedProductoId);
    }
  }, [selectedProductoId, tipoMerma]);

  const cargarReceta = async (prodId: string) => {
    setIsLoadingReceta(true);
    const res = await fetchRecetaProductoAction(prodId);
    setIsLoadingReceta(false);
    if (res.success) {
      setRecetaItems(res.items || []);
      setHasRecipe(res.hasRecipe || false);
    } else {
      setRecetaItems([]);
      setHasRecipe(false);
    }
  };

  // Cálculo en vivo de la pérdida para Insumo
  const liveLossInsumo = useMemo(() => {
    if (!selectedInsumo) return 0;
    const qty = parseFloat(cantidadInsumoStr.replace(',', '.')) || 0;
    const cost = parseFloat(String(selectedInsumo.costo_promedio || 0));
    return qty * cost;
  }, [selectedInsumo, cantidadInsumoStr]);

  // Cálculo en vivo de la pérdida para Producto
  const liveLossProducto = useMemo(() => {
    const cantProd = parseFloat(cantidadProductoStr.replace(',', '.')) || 0;
    if (cantProd <= 0) return 0;

    // Si tiene receta
    if (recetaItems.length > 0) {
      const costoPorUnidad = recetaItems.reduce((acc, item) => {
        const ins = insumos.find(i => i.id === item.insumo_id) || item;
        const costoUnit = parseFloat(String(ins.costo_promedio || item.costo_promedio || 0));
        return acc + (item.cantidad_necesaria * costoUnit);
      }, 0);
      return cantProd * costoPorUnidad;
    }

    // Fallback a costo registrado en producto si no hay ingredientes
    const costoProd = parseFloat(String(selectedProducto?.costo || 0));
    return cantProd * costoProd;
  }, [recetaItems, cantidadProductoStr, selectedProducto, insumos]);

  // Estadísticas KPI
  const stats = useMemo(() => {
    const totalPerdida = mermas.reduce((acc, m) => acc + (Number(m.total_loss) || 0), 0);
    const totalCantidad = mermas.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
    const totalRegistros = mermas.length;

    const impactoPorItem: Record<string, { nombre: string; total: number }> = {};
    mermas.forEach(m => {
      const nombre = m.insumo_nombre || 'Desconocido';
      if (!impactoPorItem[nombre]) impactoPorItem[nombre] = { nombre, total: 0 };
      impactoPorItem[nombre].total += Number(m.total_loss) || 0;
    });

    const topItem = Object.values(impactoPorItem).sort((a, b) => b.total - a.total)[0];

    return {
      totalPerdida,
      totalCantidad,
      totalRegistros,
      topItemNombre: topItem?.nombre || 'Ninguno',
      topItemPerdida: topItem?.total || 0
    };
  }, [mermas]);

  // Lista filtrada
  const filteredMermas = useMemo(() => {
    return mermas.filter(m => {
      const matchesSearch = 
        (m.insumo_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.motivo_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.operador_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesReason = !selectedReasonFilter || m.reason_id === selectedReasonFilter;

      return matchesSearch && matchesReason;
    });
  }, [mermas, searchTerm, selectedReasonFilter]);

  const handleOpenModal = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setTipoMerma(productos.length > 0 ? 'PRODUCTO' : 'INSUMO');
    setSelectedInsumoId(insumos[0]?.id || '');
    setCantidadInsumoStr('1');
    setSelectedProductoId(productos[0]?.id || '');
    setCantidadProductoStr('1');
    setSelectedReasonId(reasons[0]?.id || '');
    setNotes('');
    setTempInsumoId(insumos[0]?.id || '');
    setTempCantidadStr('');
    setIsModalOpen(true);
  };

  const handleCantidadInsumoChange = (raw: string) => {
    const clean = raw.replace(',', '.');
    if (clean === '' || /^\d*\.?\d*$/.test(clean)) {
      setCantidadInsumoStr(clean);
    }
  };

  const handleCantidadProductoChange = (raw: string) => {
    const clean = raw.replace(',', '.');
    if (clean === '' || /^\d*\.?\d*$/.test(clean)) {
      setCantidadProductoStr(clean);
    }
  };

  const handleAgregarIngredienteAlVuelo = () => {
    if (!tempInsumoId) return;
    const qty = parseFloat(tempCantidadStr.replace(',', '.')) || 0;
    if (qty <= 0) {
      alert('Ingresa una cantidad válida mayor a 0 para el ingrediente.');
      return;
    }
    const ins = insumos.find(i => i.id === tempInsumoId);
    if (!ins) return;

    // Verificar si ya existe
    if (recetaItems.some(i => i.insumo_id === tempInsumoId)) {
      setRecetaItems(recetaItems.map(i => i.insumo_id === tempInsumoId ? { ...i, cantidad_necesaria: qty } : i));
    } else {
      setRecetaItems([
        ...recetaItems,
        {
          insumo_id: ins.id,
          nombre: ins.nombre,
          unidad_medida: ins.unidad_medida || 'u',
          costo_promedio: Number(ins.costo_promedio || 0),
          stock_disponible: Number(ins.cantidad_actual || 0),
          cantidad_necesaria: qty
        }
      ]);
    }

    setTempCantidadStr('');
    setHasRecipe(true);
  };

  const handleRemoverIngrediente = (insumoId: string) => {
    setRecetaItems(recetaItems.filter(i => i.insumo_id !== insumoId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // ── CASO A: MERMA DE PRODUCTO COMPLETO (RECETA) ─────────────────
    if (tipoMerma === 'PRODUCTO') {
      if (!selectedProductoId) {
        setErrorMsg('Debes seleccionar un producto.');
        return;
      }
      const cantProd = parseFloat(cantidadProductoStr.replace(',', '.')) || 0;
      if (cantProd <= 0) {
        setErrorMsg('La cantidad de productos mermados debe ser mayor a 0.');
        return;
      }

      if (recetaItems.length === 0) {
        setErrorMsg(`El producto "${selectedProducto?.nombre}" no tiene receta configurada. Agrega al menos un ingrediente para poder descontarlo del almacén.`);
        return;
      }

      setIsSubmitting(true);
      const res = await registrarMermaProductoAction({
        productoId: selectedProductoId,
        cantidadProducto: cantProd,
        reasonId: selectedReasonId,
        notes: notes.trim(),
        sedeId: activeSedeId,
        ingredientesPersonalizados: recetaItems.map(i => ({
          insumo_id: i.insumo_id,
          cantidad_necesaria: i.cantidad_necesaria
        })),
        guardarRecetaEnProducto: guardarReceta
      });
      setIsSubmitting(false);

      if (res.success) {
        const reasonName = reasons.find(r => r.id === selectedReasonId)?.name || 'Merma';
        const nuevaMerma: MermaItem = {
          id: crypto.randomUUID(),
          empresa_id: empresaId,
          sede_id: activeSedeId,
          producto_id: selectedProductoId,
          reason_id: selectedReasonId,
          quantity: cantProd,
          unit_cost: liveLossProducto / cantProd,
          total_loss: res.costoTotalMerma || liveLossProducto,
          notes: `Baja de producto: ${selectedProducto?.nombre} (${res.insumosDescontados} insumos descontados). ${notes}`,
          created_at: new Date().toISOString(),
          insumo_nombre: `[Producto] ${selectedProducto?.nombre}`,
          insumo_unidad: 'und',
          motivo_nombre: reasonName,
          operador_nombre: 'Tú',
          es_producto: true
        };

        setMermas([nuevaMerma, ...mermas]);
        setIsModalOpen(false);
        setSuccessMsg(`¡Merma procesada! Se descontaron los insumos correspondientes a ${cantProd} unidad(es) de "${selectedProducto?.nombre}".`);
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg(res.error || 'Ocurrió un error al registrar la merma de producto');
      }
      return;
    }

    // ── CASO B: MERMA DE INSUMO INDIVIDUAL ──────────────────────────
    if (!selectedInsumoId) {
      setErrorMsg('Debes seleccionar un insumo.');
      return;
    }

    const cantidadInsumo = parseFloat(cantidadInsumoStr.replace(',', '.')) || 0;
    if (cantidadInsumo <= 0) {
      setErrorMsg('Ingresa una cantidad mayor a 0.');
      return;
    }

    if (selectedInsumo && cantidadInsumo > (selectedInsumo.cantidad_actual || 0)) {
      const confirmExceed = window.confirm(
        `La cantidad a mermar (${cantidadInsumo} ${selectedInsumo.unidad_medida}) supera el stock registrado (${selectedInsumo.cantidad_actual} ${selectedInsumo.unidad_medida}). ¿Deseas registrar la baja de todas formas?`
      );
      if (!confirmExceed) return;
    }

    setIsSubmitting(true);
    const res = await registrarMermaInsumo({
      insumoId: selectedInsumoId,
      cantidad: cantidadInsumo,
      reasonId: selectedReasonId,
      notes: notes.trim(),
      sedeId: activeSedeId
    });
    setIsSubmitting(false);

    if (res.success) {
      const reasonName = reasons.find(r => r.id === selectedReasonId)?.name || 'Merma';
      const nuevaMerma: MermaItem = {
        id: res.merma?.id || crypto.randomUUID(),
        empresa_id: empresaId,
        sede_id: activeSedeId,
        insumo_id: selectedInsumoId,
        reason_id: selectedReasonId,
        quantity: cantidadInsumo,
        unit_cost: selectedInsumo?.costo_promedio || 0,
        total_loss: res.totalLoss || (cantidadInsumo * (selectedInsumo?.costo_promedio || 0)),
        notes: notes.trim(),
        created_at: new Date().toISOString(),
        insumo_nombre: selectedInsumo?.nombre || 'Insumo',
        insumo_unidad: selectedInsumo?.unidad_medida || 'u',
        motivo_nombre: reasonName,
        operador_nombre: 'Tú',
        es_producto: false
      };

      setMermas([nuevaMerma, ...mermas]);
      setIsModalOpen(false);
      setSuccessMsg(`Merma registrada: se descontaron ${cantidadInsumo} ${selectedInsumo?.unidad_medida} de ${selectedInsumo?.nombre}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Ocurrió un error al registrar la merma');
    }
  };

  const handleRevertir = async (merma: MermaItem) => {
    const confirmRevert = window.confirm(
      `¿Deseas revertir esta merma de "${merma.insumo_nombre}"? El stock de sus insumos correspondientes será devuelto al almacén.`
    );
    if (!confirmRevert) return;

    setRevertingId(merma.id);
    const res = await revertirMermaInsumo(merma.id);
    setRevertingId(null);

    if (res.success) {
      setMermas(mermas.filter(m => m.id !== merma.id));
      setSuccessMsg(`Merma revertida y stock restablecido.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'No se pudo revertir la merma');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DE CONTROL */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trash2 className="text-rose-400" />
            Control de Mermas y Pérdidas
          </h2>
          <p className="text-sm text-neutral-400">
            Registra bajas de materia prima individual o de productos completos (ej: pizzas quemadas o platos fallidos) descontando sus recetas automáticamente.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all cursor-pointer shrink-0"
        >
          <Plus size={18} />
          Registrar Merma
        </button>
      </div>

      {/* MENSAJES FEEDBACK */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CARDS DE RESUMEN KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Pérdida Económica Total</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {canSeeCosts ? `$${stats.totalPerdida.toFixed(2)}` : '***'}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Costos acumulados en mermas</span>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Unidades Mermadas</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {Number.isInteger(stats.totalCantidad) ? stats.totalCantidad : stats.totalCantidad.toFixed(2)}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Volumen o unidades descartadas</span>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Eventos de Merma</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.totalRegistros}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Registros históricos procesados</span>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Mayor Impacto Económico</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="text-base font-bold text-white truncate" title={stats.topItemNombre}>
            {stats.topItemNombre}
          </div>
          <span className="text-[11px] text-rose-400 mt-1 block">
            {canSeeCosts ? `Pérdida: $${stats.topItemPerdida.toFixed(2)}` : 'Mayor recurrencia'}
          </span>
        </div>

      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por producto, insumo, motivo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-3">
          <select
            value={selectedReasonFilter}
            onChange={e => setSelectedReasonFilter(e.target.value)}
            className="w-full sm:w-56 bg-black border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          >
            <option value="">Todos los Motivos</option>
            {reasons.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA DE HISTORIAL DE MERMAS */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-black/40 text-xs uppercase text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Fecha y Hora</th>
                <th className="px-5 py-3.5 font-semibold">Ítem Descartado</th>
                <th className="px-5 py-3.5 font-semibold">Cantidad</th>
                <th className="px-5 py-3.5 font-semibold">Costo Unit.</th>
                <th className="px-5 py-3.5 font-semibold">Pérdida Total</th>
                <th className="px-5 py-3.5 font-semibold">Motivo</th>
                <th className="px-5 py-3.5 font-semibold">Detalles / Notas</th>
                <th className="px-5 py-3.5 font-semibold">Operador</th>
                <th className="px-5 py-3.5 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredMermas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-neutral-500">
                    <Trash2 size={36} className="mx-auto text-neutral-600 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No se encontraron registros de mermas</p>
                    <p className="text-xs text-neutral-600 mt-1">
                      {searchTerm || selectedReasonFilter 
                        ? 'Prueba ajustando los filtros de búsqueda' 
                        : 'Utiliza el botón "Registrar Merma" para dar de baja productos quemados o insumos dañados'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMermas.map(m => {
                  let fechaFormatted = m.created_at;
                  try {
                    fechaFormatted = format(parseISO(m.created_at), 'dd/MM/yyyy HH:mm', { locale: es });
                  } catch {
                    // fallback
                  }

                  return (
                    <tr key={m.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-neutral-400 font-mono">
                        {fechaFormatted}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {m.es_producto ? (
                            <span className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Producto Elaborado / Receta">
                              <ChefHat size={14} />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" title="Insumo / Materia Prima">
                              <Package size={14} />
                            </span>
                          )}
                          <span>{m.insumo_nombre}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-rose-400">
                        -{m.quantity} <span className="text-xs font-normal text-neutral-400">{m.insumo_unidad}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-neutral-400 font-mono">
                        {canSeeCosts ? `$${m.unit_cost.toFixed(2)}` : '***'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-rose-400">
                        {canSeeCosts ? `$${m.total_loss.toFixed(2)}` : '***'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          {m.motivo_nombre}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-neutral-400 max-w-[220px] truncate" title={m.notes}>
                        {m.notes || <span className="text-neutral-600 italic">Sin notas</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-neutral-400">
                        {m.operador_nombre || 'Sistema'}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleRevertir(m)}
                          disabled={revertingId === m.id}
                          className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-700/60 inline-flex items-center gap-1.5 disabled:opacity-50"
                          title="Revertir merma y reintegrar stock al almacén"
                        >
                          {revertingId === m.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RotateCcw size={12} />
                          )}
                          Revertir
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR MERMA (SOPORTE PRODUCTO COMPLETO E INSUMO) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trash2 size={20} className="text-rose-400" />
                Registrar Merma / Pérdida
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector de Tipo: Producto Completo vs Insumo Individual */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/60 rounded-xl border border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setTipoMerma('PRODUCTO')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  tipoMerma === 'PRODUCTO'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <ChefHat size={16} />
                <span>Producto Elaborado / Receta</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoMerma('INSUMO')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  tipoMerma === 'INSUMO'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Package size={16} />
                <span>Insumo / Materia Prima</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              
              {/* ── MODO PRODUCTO COMPLETO (EJ. PIZZA QUE SE QUEMÓ) ── */}
              {tipoMerma === 'PRODUCTO' && (
                <div className="space-y-4">
                  
                  {/* Selector de Producto */}
                  <div>
                    <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                      Seleccionar Producto Elaborado * (ej. Pizza, Plato, Bebida)
                    </label>
                    <select
                      value={selectedProductoId}
                      onChange={e => setSelectedProductoId(e.target.value)}
                      required
                      className="w-full bg-black border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                    >
                      <option value="">Selecciona un producto del menú...</option>
                      {productos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.precio_venta ? `($${p.precio_venta})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad de Productos Mermados */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                        Cantidad de Productos Mermados * (ej: 1, 2)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="1"
                        required
                        value={cantidadProductoStr}
                        onChange={e => handleCantidadProductoChange(e.target.value)}
                        className="w-full bg-black border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                        Motivo de Merma *
                      </label>
                      <select
                        value={selectedReasonId}
                        onChange={e => setSelectedReasonId(e.target.value)}
                        required
                        className="w-full bg-black border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                      >
                        {reasons.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Desglose de Insumos de la Receta */}
                  <div className="bg-black/40 border border-neutral-800 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                        <UtensilsCrossed size={14} className="text-rose-400" />
                        Insumos a descontar de la receta ({recetaItems.length})
                      </span>
                      {isLoadingReceta && <Loader2 size={14} className="animate-spin text-neutral-500" />}
                    </div>

                    {recetaItems.length === 0 && !isLoadingReceta ? (
                      <div className="text-xs text-neutral-400 space-y-2 py-2">
                        <p className="text-amber-400/90 font-medium flex items-center gap-1.5">
                          <AlertTriangle size={14} /> Este producto no tiene ingredientes asignados aún.
                        </p>
                        <p className="text-neutral-500 text-[11px]">
                          Agrega los insumos que componen 1 unidad de este producto para descontarlos automáticamente:
                        </p>

                        {/* Agregar ingrediente al vuelo */}
                        <div className="flex flex-wrap gap-2 items-end pt-1">
                          <div className="flex-1 min-w-[160px]">
                            <select
                              value={tempInsumoId}
                              onChange={e => setTempInsumoId(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                            >
                              {insumos.map(i => (
                                <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Cant. (ej 0.25)"
                              value={tempCantidadStr}
                              onChange={e => setTempCantidadStr(e.target.value.replace(',', '.'))}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAgregarIngredienteAlVuelo}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium"
                          >
                            + Añadir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {recetaItems.map((item, idx) => {
                          const cantProd = parseFloat(cantidadProductoStr.replace(',', '.')) || 1;
                          const totalDescontar = Number((item.cantidad_necesaria * cantProd).toFixed(4));
                          const costoSub = totalDescontar * item.costo_promedio;

                          return (
                            <div key={idx} className="flex justify-between items-center text-xs bg-neutral-950/70 p-2 rounded-lg border border-neutral-800/60">
                              <div>
                                <span className="font-medium text-white">{item.nombre}</span>
                                <div className="text-[11px] text-neutral-400">
                                  Receta base: {item.cantidad_necesaria} {item.unidad_medida} / und
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-rose-400 block">
                                  -{totalDescontar} {item.unidad_medida}
                                </span>
                                {canSeeCosts && costoSub > 0 && (
                                  <span className="text-[10px] text-neutral-500 font-mono">
                                    -${costoSub.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Opción de guardar receta si fue armada al vuelo */}
                        {!hasRecipe && recetaItems.length > 0 && (
                          <div className="pt-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="guardarReceta"
                              checked={guardarReceta}
                              onChange={e => setGuardarReceta(e.target.checked)}
                              className="rounded border-neutral-700 text-rose-600 focus:ring-0"
                            />
                            <label htmlFor="guardarReceta" className="text-xs text-neutral-300">
                              Guardar estos ingredientes como receta permanente del producto en el Catálogo
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Pérdida Total Estimada de la Receta */}
                  {liveLossProducto > 0 && canSeeCosts && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex justify-between items-center text-xs text-rose-300">
                      <span className="font-medium flex items-center gap-1.5">
                        <TrendingDown size={15} /> Costo total de ingredientes perdidos:
                      </span>
                      <span className="font-mono font-bold text-base text-rose-400">
                        -${liveLossProducto.toFixed(2)}
                      </span>
                    </div>
                  )}

                </div>
              )}

              {/* ── MODO INSUMO INDIVIDUAL ── */}
              {tipoMerma === 'INSUMO' && (
                <div className="space-y-4">
                  
                  {/* Selector de Insumo */}
                  <div>
                    <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                      Seleccionar Insumo *
                    </label>
                    <select
                      value={selectedInsumoId}
                      onChange={e => setSelectedInsumoId(e.target.value)}
                      required
                      className="w-full bg-black border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                    >
                      <option value="">Selecciona un insumo...</option>
                      {insumos.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} ({i.unidad_medida}) — Stock: {i.cantidad_actual}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Info rápida insumo */}
                  {selectedInsumo && (
                    <div className="bg-black/50 border border-neutral-800/80 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-neutral-500 block">Stock Disponible:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {selectedInsumo.cantidad_actual} {selectedInsumo.unidad_medida}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-neutral-500 block">Costo Promedio:</span>
                        <span className="font-mono font-bold text-white text-sm">
                          ${Number(selectedInsumo.costo_promedio || 0).toFixed(2)} / {selectedInsumo.unidad_medida}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cantidad y Motivo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                        Cantidad a Mermar * (permite decimales)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        required
                        value={cantidadInsumoStr}
                        onChange={e => handleCantidadInsumoChange(e.target.value)}
                        className="w-full bg-black border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                        Motivo de Merma *
                      </label>
                      <select
                        value={selectedReasonId}
                        onChange={e => setSelectedReasonId(e.target.value)}
                        required
                        className="w-full bg-black border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                      >
                        {reasons.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Pérdida Estimada en tiempo real */}
                  {selectedInsumo && liveLossInsumo > 0 && canSeeCosts && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex justify-between items-center text-xs text-rose-300">
                      <span className="font-medium flex items-center gap-1.5">
                        <TrendingDown size={15} /> Impacto económico estimado:
                      </span>
                      <span className="font-mono font-bold text-sm text-rose-400">
                        -${liveLossInsumo.toFixed(2)}
                      </span>
                    </div>
                  )}

                </div>
              )}

              {/* Observaciones Generales */}
              <div>
                <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                  Observaciones / Causa detallada (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder={tipoMerma === 'PRODUCTO' ? 'Ej: Se quemó en el horno durante el servicio de cena...' : 'Ej: Se rompió el envase en bodega...'}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-rose-500"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (tipoMerma === 'PRODUCTO' && recetaItems.length === 0)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Confirmar Baja de Inventario
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
