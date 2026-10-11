'use client';

import React, { useState, useTransition } from 'react';
import { 
  Sparkles, Plus, Search, Edit2, Trash2, Clock, Calendar, 
  CheckCircle2, XCircle, Tag, Wine, Layers, ShieldCheck, ChevronRight 
} from 'lucide-react';
import { PromocionCombo, togglePromocionEstado, eliminarPromocion } from '@/actions/promociones-actions';
import PromocionFormModal from './PromocionFormModal';

interface Props {
  promocionesIniciales: PromocionCombo[];
  categorias: { id: string; nombre: string }[];
  productos: { id: string; nombre: string; precio_venta: number; categoria_id?: string }[];
}

export default function PromocionesClient({
  promocionesIniciales,
  categorias,
  productos,
}: Props) {
  const [promociones, setPromociones] = useState<PromocionCombo[]>(promocionesIniciales);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [promoSeleccionada, setPromoSeleccionada] = useState<PromocionCombo | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    setPromociones((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado_activo: nuevoEstado } : p))
    );

    startTransition(async () => {
      await togglePromocionEstado(id, nuevoEstado);
    });
  };

  const handleEliminar = (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la promoción "${nombre}"?`)) return;

    setPromociones((prev) => prev.filter((p) => p.id !== id));

    startTransition(async () => {
      await eliminarPromocion(id);
    });
  };

  const abrirModalCrear = () => {
    setPromoSeleccionada(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (promo: PromocionCombo) => {
    setPromoSeleccionada(promo);
    setModalAbierto(true);
  };

  const recargarPromos = () => {
    startTransition(async () => {
      const { getPromociones } = await import('@/actions/promociones-actions');
      const list = await getPromociones();
      setPromociones(list);
    });
  };

  const promocionesFiltradas = promociones.filter((p) => {
    const matchBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.descripcion || '').toLowerCase().includes(busqueda.toLowerCase());

    const matchTipo =
      filtroTipo === 'TODOS' ||
      (filtroTipo === 'ACTIVAS' && p.estado_activo) ||
      (filtroTipo === 'INACTIVAS' && !p.estado_activo) ||
      (filtroTipo === 'NX_M' && p.tipo === 'NX_M') ||
      (filtroTipo === 'COMBO' && p.tipo === 'COMBO_GRUPOS');

    return matchBusqueda && matchTipo;
  });

  const getReglaLabel = (p: PromocionCombo) => {
    switch (p.regla_precio) {
      case 'COBRAR_MAYOR':
        return 'Cobra el de Mayor Precio';
      case 'COBRAR_MENOR':
        return 'Cobra el de Menor Precio';
      case 'PRECIO_FIJO':
        return `Precio Fijo $${p.precio_fijo?.toFixed(2) || '0.00'}`;
      case 'DESCUENTO_PCT':
        return `${p.descuento_porcentaje}% de Descuento`;
      default:
        return p.regla_precio;
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior con Filtros y Botón de Nueva Promo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-300 text-sm focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="TODOS">Todas</option>
            <option value="ACTIVAS">Solo Activas</option>
            <option value="INACTIVAS">Solo Inactivas</option>
            <option value="NX_M">Promos 2x1 / NxM</option>
            <option value="COMBO">Combos</option>
          </select>
        </div>

        <button
          onClick={abrirModalCrear}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={18} />
          Nueva Promoción o Combo
        </button>
      </div>

      {/* Grid de Tarjetas de Promociones */}
      {promocionesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-neutral-900/40 border border-neutral-800 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
            <Sparkles size={28} />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">No hay promociones encontradas</h3>
          <p className="text-neutral-400 text-sm max-w-md mb-6">
            Crea tu primera promoción como un 2x1 en cócteles o combos para aumentar tus ventas en el POS.
          </p>
          <button
            onClick={abrirModalCrear}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus size={16} />
            Crear mi primera promo (Ej: 2x1)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {promocionesFiltradas.map((promo) => {
            const config = promo.config_seleccion;
            const primerGrupo = config?.grupos?.[0];
            const cantidad = config?.cantidad_total || 2;

            return (
              <div
                key={promo.id}
                className={`relative group bg-neutral-900/70 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-black/50 ${
                  promo.estado_activo
                    ? 'border-neutral-800 hover:border-indigo-500/40'
                    : 'border-neutral-800/50 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Glow decorativo sutil en hover */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Wine size={20} />
                      </div>
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-1">
                          {cantidad}x{config?.cobrar_cantidad || 1} • {promo.tipo === 'NX_M' ? 'PROMO' : 'COMBO'}
                        </span>
                        <h4 className="text-white font-bold text-base leading-snug line-clamp-1">
                          {promo.nombre}
                        </h4>
                      </div>
                    </div>

                    {/* Switch de Encendido / Apagado en Vivo */}
                    <button
                      type="button"
                      onClick={() => handleToggle(promo.id, promo.estado_activo)}
                      title={promo.estado_activo ? 'Promoción activa en POS' : 'Promoción desactivada'}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                        promo.estado_activo ? 'bg-indigo-600' : 'bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          promo.estado_activo ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Descripción */}
                  {promo.descripcion && (
                    <p className="text-neutral-400 text-xs mb-4 line-clamp-2">
                      {promo.descripcion}
                    </p>
                  )}

                  {/* Metadatos y Reglas */}
                  <div className="space-y-2 py-3 border-y border-neutral-800/60 my-3 text-xs">
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-neutral-500 flex items-center gap-1.5">
                        <Tag size={13} /> Regla de Precio:
                      </span>
                      <span className="font-semibold text-indigo-400">
                        {getReglaLabel(promo)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-neutral-500 flex items-center gap-1.5">
                        <Layers size={13} /> Filtro Elegible:
                      </span>
                      <span className="font-medium text-white truncate max-w-[160px]">
                        {primerGrupo?.categoria_nombre || 'Todo el catálogo'}
                      </span>
                    </div>

                    {(promo.hora_inicio || promo.hora_fin) && (
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="text-neutral-500 flex items-center gap-1.5">
                          <Clock size={13} /> Horario:
                        </span>
                        <span className="font-medium text-amber-400">
                          {promo.hora_inicio || '00:00'} - {promo.hora_fin || '23:59'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Días Activos */}
                  <div className="flex items-center gap-1 flex-wrap mb-4">
                    {(promo.dias_activos || []).map((dia) => (
                      <span
                        key={dia}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400"
                      >
                        {dia.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pie de Tarjeta con Acciones */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/50">
                  <span
                    className={`text-xs font-semibold flex items-center gap-1.5 ${
                      promo.estado_activo ? 'text-emerald-400' : 'text-neutral-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        promo.estado_activo ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
                      }`}
                    />
                    {promo.estado_activo ? 'Disponible en Terminal' : 'Inactiva'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirModalEditar(promo)}
                      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Editar promoción"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleEliminar(promo.id, promo.nombre)}
                      className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar promoción"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      <PromocionFormModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSuccess={recargarPromos}
        promoEditar={promoSeleccionada}
        categorias={categorias}
        productos={productos}
      />
    </div>
  );
}
