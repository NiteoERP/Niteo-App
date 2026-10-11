'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Trash2, Clock, Calendar, Check, AlertCircle, HelpCircle } from 'lucide-react';
import { PromocionCombo, guardarPromocion } from '@/actions/promociones-actions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promoEditar?: PromocionCombo | null;
  categorias: { id: string; nombre: string }[];
  productos: { id: string; nombre: string; precio_venta: number; categoria_id?: string }[];
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function PromocionFormModal({
  isOpen,
  onClose,
  onSuccess,
  promoEditar,
  categorias,
  productos,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'NX_M' | 'COMBO_GRUPOS'>('NX_M');
  const [reglaPrecio, setReglaPrecio] = useState<'COBRAR_MAYOR' | 'COBRAR_MENOR' | 'PRECIO_FIJO' | 'DESCUENTO_PCT'>('COBRAR_MAYOR');
  const [precioFijo, setPrecioFijo] = useState<number>(0);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);

  // Configuración de selección
  const [cantidadTotal, setCantidadTotal] = useState<number>(2);
  const [cobrarCantidad, setCobrarCantidad] = useState<number>(1);
  const [categoriaId, setCategoriaId] = useState<string>('');
  
  // Días y Horarios
  const [diasActivos, setDiasActivos] = useState<string[]>(DIAS_SEMANA);
  const [horaInicio, setHoraInicio] = useState<string>('');
  const [horaFin, setHoraFin] = useState<string>('');
  const [estadoActivo, setEstadoActivo] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar o resetear datos
  useEffect(() => {
    if (promoEditar) {
      setNombre(promoEditar.nombre);
      setDescripcion(promoEditar.descripcion || '');
      setTipo(promoEditar.tipo);
      setReglaPrecio(promoEditar.regla_precio);
      setPrecioFijo(promoEditar.precio_fijo || 0);
      setDescuentoPorcentaje(promoEditar.descuento_porcentaje || 0);
      setCantidadTotal(promoEditar.config_seleccion?.cantidad_total || 2);
      setCobrarCantidad(promoEditar.config_seleccion?.cobrar_cantidad || 1);
      
      const primerGrupo = promoEditar.config_seleccion?.grupos?.[0];
      setCategoriaId(primerGrupo?.categoria_id || '');
      
      setDiasActivos(promoEditar.dias_activos || DIAS_SEMANA);
      setHoraInicio(promoEditar.hora_inicio || '');
      setHoraFin(promoEditar.hora_fin || '');
      setEstadoActivo(promoEditar.estado_activo);
    } else {
      // Default: 2x1 en Cócteles
      setNombre('2x1 en Cócteles');
      setDescripcion('Lleva 2 cócteles de tu preferencia y se cobra únicamente el de mayor precio.');
      setTipo('NX_M');
      setReglaPrecio('COBRAR_MAYOR');
      setCantidadTotal(2);
      setCobrarCantidad(1);
      setPrecioFijo(0);
      setDescuentoPorcentaje(0);
      setDiasActivos(DIAS_SEMANA);
      setHoraInicio('');
      setHoraFin('');
      setEstadoActivo(true);
      
      // Auto-seleccionar categoría cócteles si existe
      const catCoctel = categorias.find(c => c.nombre.toLowerCase().includes('coctel') || c.nombre.toLowerCase().includes('cóctel') || c.nombre.toLowerCase().includes('trago'));
      if (catCoctel) setCategoriaId(catCoctel.id);
      else if (categorias.length > 0) setCategoriaId(categorias[0].id);
    }
    setError(null);
  }, [promoEditar, isOpen, categorias]);

  if (!isOpen) return null;

  const aplicarPlantilla = (plantilla: '2X1' | '3X2' | 'COMBO_FIJO') => {
    if (plantilla === '2X1') {
      setNombre('2x1 en Cócteles');
      setDescripcion('Lleva 2 cócteles de tu preferencia y se cobra únicamente el de mayor precio.');
      setTipo('NX_M');
      setReglaPrecio('COBRAR_MAYOR');
      setCantidadTotal(2);
      setCobrarCantidad(1);
    } else if (plantilla === '3X2') {
      setNombre('3x2 en Cervezas');
      setDescripcion('Lleva 3 bebidas y paga solo 2.');
      setTipo('NX_M');
      setReglaPrecio('COBRAR_MAYOR');
      setCantidadTotal(3);
      setCobrarCantidad(2);
    } else if (plantilla === 'COMBO_FIJO') {
      setNombre('Combo Especial');
      setDescripcion('Elige tus productos por un precio cerrado.');
      setTipo('NX_M');
      setReglaPrecio('PRECIO_FIJO');
      setCantidadTotal(2);
      setCobrarCantidad(2);
      setPrecioFijo(10);
    }
  };

  const toggleDia = (dia: string) => {
    if (diasActivos.includes(dia)) {
      if (diasActivos.length === 1) return; // al menos 1 día
      setDiasActivos(diasActivos.filter(d => d !== dia));
    } else {
      setDiasActivos([...diasActivos, dia]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Debes especificar el nombre de la promoción');
      return;
    }

    setLoading(true);
    setError(null);

    const catSeleccionada = categorias.find(c => c.id === categoriaId);

    const config_seleccion = {
      cantidad_total: Number(cantidadTotal) || 2,
      cobrar_cantidad: Number(cobrarCantidad) || 1,
      grupos: [
        {
          titulo: `Selecciona ${cantidadTotal} producto(s)`,
          cantidad: Number(cantidadTotal) || 2,
          filtro_tipo: 'CATEGORIA' as const,
          categoria_id: categoriaId || undefined,
          categoria_nombre: catSeleccionada?.nombre || 'General',
          permitir_repetidos: true,
        }
      ]
    };

    const res = await guardarPromocion({
      id: promoEditar?.id,
      nombre,
      descripcion,
      tipo,
      regla_precio: reglaPrecio,
      precio_fijo: Number(precioFijo) || 0,
      descuento_porcentaje: Number(descuentoPorcentaje) || 0,
      config_seleccion,
      dias_activos: diasActivos,
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      estado_activo: estadoActivo,
    });

    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || 'Ocurrió un error al guardar la promoción');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabecera Modal */}
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {promoEditar ? 'Editar Promoción / Combo' : 'Nueva Promoción o Combo'}
              </h3>
              <p className="text-xs text-neutral-400">
                Configura promociones automáticas para tu terminal de ventas
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

        {/* Plantillas Rápidas (Solo al crear nueva) */}
        {!promoEditar && (
          <div className="px-6 py-3 bg-neutral-950/60 border-b border-neutral-800/60 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-neutral-500 font-semibold uppercase tracking-wider text-[10px] shrink-0">
              Plantillas Rápidas:
            </span>
            <button
              type="button"
              onClick={() => aplicarPlantilla('2X1')}
              className="px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all shrink-0 font-medium"
            >
              🍸 2x1 en Cócteles (Cobra el más caro)
            </button>
            <button
              type="button"
              onClick={() => aplicarPlantilla('3X2')}
              className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all shrink-0 font-medium"
            >
              🍺 3x2 en Cervezas
            </button>
            <button
              type="button"
              onClick={() => aplicarPlantilla('COMBO_FIJO')}
              className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all shrink-0 font-medium"
            >
              🍔 Combo Precio Fijo ($10)
            </button>
          </div>
        )}

        {/* Contenido con Scroll */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Información Básica */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Nombre de la Promoción *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: 2x1 en Cócteles de la Casa"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Descripción para el Ticket / Cajero
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Elige 2 cócteles y paga solo el de mayor valor"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
              />
            </div>
          </div>

          {/* Reglas de Selección y Cobro */}
          <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400" />
              Dinámica de Cobro y Cantidades
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Cantidad a Escoger en el Modal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={cantidadTotal}
                    onChange={(e) => setCantidadTotal(parseInt(e.target.value) || 2)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-neutral-400 whitespace-nowrap">ítems</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  En un 2x1 son 2 ítems; en un 3x2 son 3 ítems.
                </p>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Regla de Cobro de la Promo
                </label>
                <select
                  value={reglaPrecio}
                  onChange={(e) => setReglaPrecio(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="COBRAR_MAYOR">⭐ Cobrar el de mayor precio (Recomendado 2x1)</option>
                  <option value="COBRAR_MENOR">Cobrar el de menor precio</option>
                  <option value="PRECIO_FIJO">Precio Fijo cerrado (Ej: $10)</option>
                  <option value="DESCUENTO_PCT">% de Descuento sobre el total</option>
                </select>
              </div>
            </div>

            {/* Inputs condicionales según regla de precio */}
            {reglaPrecio === 'PRECIO_FIJO' && (
              <div className="pt-2 border-t border-neutral-800/60">
                <label className="block text-xs text-neutral-300 mb-1">
                  Precio Fijo de la Promoción (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioFijo}
                    onChange={(e) => setPrecioFijo(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="10.00"
                  />
                </div>
              </div>
            )}

            {reglaPrecio === 'DESCUENTO_PCT' && (
              <div className="pt-2 border-t border-neutral-800/60">
                <label className="block text-xs text-neutral-300 mb-1">
                  Porcentaje de Descuento (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={descuentoPorcentaje}
                    onChange={(e) => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="25"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">%</span>
                </div>
              </div>
            )}

            {/* Categoría permitida */}
            <div className="pt-2 border-t border-neutral-800/60">
              <label className="block text-xs text-neutral-300 mb-1">
                Categoría de Productos Elegibles en el Modal
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Todas las categorías (Todo el catálogo)</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-500 mt-1">
                Solo los productos de esta categoría se mostrarán para seleccionar en el 2x1 (ej: Cócteles).
              </p>
            </div>
          </div>

          {/* Días y Horarios */}
          <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-indigo-400" />
              Días y Horarios Activos (Happy Hour)
            </h4>

            <div>
              <label className="block text-xs text-neutral-400 mb-2">Días válidos</label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map((dia) => {
                  const activo = diasActivos.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activo
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 flex items-center gap-1">
                  <Clock size={12} /> Hora Inicio (Opcional)
                </label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 flex items-center gap-1">
                  <Clock size={12} /> Hora Fin (Opcional)
                </label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Switch Activo / Inactivo */}
          <div className="flex items-center justify-between p-3 bg-neutral-950/40 border border-neutral-800 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-white">Estado de la Promoción</p>
              <p className="text-xs text-neutral-400">Si está inactiva, no aparecerá en el terminal de venta</p>
            </div>
            <button
              type="button"
              onClick={() => setEstadoActivo(!estadoActivo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                estadoActivo ? 'bg-indigo-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  estadoActivo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>Guardando...</>
              ) : (
                <>
                  <Check size={16} />
                  {promoEditar ? 'Guardar Cambios' : 'Crear Promoción'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
