'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  getDay, addMonths, subMonths, isSameDay, parseISO, isValid,
  subDays, startOfYear, endOfYear
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check, X } from 'lucide-react';

export interface NiteoDateRangePickerProps {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  label?: string;
  placeholder?: string;
  align?: 'left' | 'right';
  className?: string;
  disabled?: boolean;
}

export default function NiteoDateRangePicker({
  startDate = '',
  endDate = '',
  onChange,
  label,
  placeholder = 'Seleccionar rango de fechas',
  align = 'right',
  className = '',
  disabled = false
}: NiteoDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estados temporales mientras el usuario selecciona en el modal
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Sincronizar con props
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate, isOpen]);

  // Mes que se está visualizando en el calendario
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (startDate) {
      const p = parseISO(startDate);
      if (isValid(p)) return p;
    }
    return new Date();
  });

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const firstDayOffset = useMemo(() => {
    return getDay(startOfMonth(viewMonth));
  }, [viewMonth]);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Manejo de clic en día del calendario
  const handleDayClick = (dayStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      // Primer clic: definir inicio
      setTempStart(dayStr);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      // Segundo clic: si es menor al inicio, intercambiar
      if (dayStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dayStr);
      } else {
        setTempEnd(dayStr);
      }
    }
  };

  const applyRange = (s: string, e: string) => {
    onChange(s, e);
    setIsOpen(false);
  };

  // Presets rápidos
  const handlePreset = (type: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear') => {
    const now = new Date();
    let s = '';
    let e = '';

    switch (type) {
      case 'today':
        s = format(now, 'yyyy-MM-dd');
        e = s;
        break;
      case 'yesterday': {
        const y = subDays(now, 1);
        s = format(y, 'yyyy-MM-dd');
        e = s;
        break;
      }
      case 'last7':
        s = format(subDays(now, 6), 'yyyy-MM-dd');
        e = format(now, 'yyyy-MM-dd');
        break;
      case 'last30':
        s = format(subDays(now, 29), 'yyyy-MM-dd');
        e = format(now, 'yyyy-MM-dd');
        break;
      case 'thisMonth':
        s = format(startOfMonth(now), 'yyyy-MM-dd');
        e = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'lastMonth': {
        const prevM = subMonths(now, 1);
        s = format(startOfMonth(prevM), 'yyyy-MM-dd');
        e = format(endOfMonth(prevM), 'yyyy-MM-dd');
        break;
      }
      case 'thisYear':
        s = format(startOfYear(now), 'yyyy-MM-dd');
        e = format(endOfYear(now), 'yyyy-MM-dd');
        break;
    }

    setTempStart(s);
    setTempEnd(e);
    applyRange(s, e);
  };

  // Texto amigable para el botón activador
  const triggerLabel = useMemo(() => {
    if (!startDate && !endDate) return placeholder;
    const sDate = startDate ? parseISO(startDate) : null;
    const eDate = endDate ? parseISO(endDate) : null;

    if (sDate && eDate && isValid(sDate) && isValid(eDate)) {
      if (startDate === endDate) {
        return format(sDate, 'dd MMM yyyy', { locale: es });
      }
      return `${format(sDate, 'dd MMM', { locale: es })} — ${format(eDate, 'dd MMM yyyy', { locale: es })}`;
    }
    if (sDate && isValid(sDate)) return `Desde ${format(sDate, 'dd MMM yyyy', { locale: es })}`;
    if (eDate && isValid(eDate)) return `Hasta ${format(eDate, 'dd MMM yyyy', { locale: es })}`;
    return placeholder;
  }, [startDate, endDate, placeholder]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {/* Botón activador */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 bg-black/40 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white text-sm rounded-xl px-4 py-2.5 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm ${
          isOpen ? 'ring-1 ring-indigo-500 border-indigo-500/50 bg-neutral-900' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon size={16} className="text-indigo-400 shrink-0" />
          <span className={startDate || endDate ? 'text-white font-medium capitalize' : 'text-neutral-500'}>
            {triggerLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          {(startDate || endDate) && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('', '');
                setTempStart('');
                setTempEnd('');
              }}
              className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Limpiar rango"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 ${
            align === 'right' ? 'right-0' : 'left-0'
          } bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 p-4 rounded-2xl shadow-2xl z-50 flex flex-col md:flex-row gap-4 w-[320px] md:w-[500px] animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Presets laterales */}
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-neutral-800 md:pr-4 md:w-36 shrink-0">
            <span className="hidden md:block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Atajos Rápidos
            </span>
            <button
              type="button"
              onClick={() => handlePreset('today')}
              className="text-left px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg whitespace-nowrap transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => handlePreset('yesterday')}
              className="text-left px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg whitespace-nowrap transition-colors"
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => handlePreset('last7')}
              className="text-left px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg whitespace-nowrap transition-colors"
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              onClick={() => handlePreset('last30')}
              className="text-left px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg whitespace-nowrap transition-colors"
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              onClick={() => handlePreset('thisMonth')}
              className="text-left px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg whitespace-nowrap transition-colors"
            >
              Este mes
            </button>
            <button
              type="button"
              onClick={() => handlePreset('lastMonth')}
              className="text-left px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg whitespace-nowrap transition-colors"
            >
              Mes anterior
            </button>
            <button
              type="button"
              onClick={() => handlePreset('thisYear')}
              className="text-left px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg whitespace-nowrap transition-colors"
            >
              Este año
            </button>
          </div>

          {/* Calendario principal */}
          <div className="flex-1">
            {/* Header del mes */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-white capitalize">
                {format(viewMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 mb-1.5">
              {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] font-bold text-neutral-500 uppercase py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`pad-${i}`} className="w-full h-8" />
              ))}
              {daysInMonth.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isStart = tempStart === dayStr;
                const isEnd = tempEnd === dayStr;
                const isSingleSelected = isStart && !tempEnd;

                // Rango efectivo (considerando hover cuando solo está seleccionado el inicio)
                const effectiveEnd = tempEnd || (tempStart && hoverDate && hoverDate >= tempStart ? hoverDate : null);
                const isInRange = tempStart && effectiveEnd && dayStr > tempStart && dayStr < effectiveEnd;
                const isToday = dayStr === todayStr;

                let cellBg = '';
                if (isStart && isEnd) {
                  cellBg = 'bg-indigo-600 text-white font-bold rounded-lg shadow-[0_0_10px_rgba(99,102,241,0.5)]';
                } else if (isStart) {
                  cellBg = 'bg-indigo-600 text-white font-bold rounded-l-lg shadow-sm';
                } else if (isEnd) {
                  cellBg = 'bg-indigo-600 text-white font-bold rounded-r-lg shadow-sm';
                } else if (isInRange) {
                  cellBg = 'bg-indigo-600/20 text-indigo-200';
                } else if (isSingleSelected) {
                  cellBg = 'bg-indigo-600 text-white font-bold rounded-lg shadow-[0_0_10px_rgba(99,102,241,0.5)]';
                } else {
                  cellBg = 'text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-lg';
                }

                return (
                  <button
                    type="button"
                    key={dayStr}
                    onClick={() => handleDayClick(dayStr)}
                    onMouseEnter={() => tempStart && !tempEnd && setHoverDate(dayStr)}
                    className={`relative flex items-center justify-center w-full h-8 text-xs font-medium transition-all ${cellBg}`}
                  >
                    <span>{format(day, 'd')}</span>
                    {isToday && !isStart && !isEnd && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer con estado y botones */}
            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
              <div className="text-[11px] text-neutral-400 truncate">
                {tempStart && tempEnd ? (
                  <span>
                    {tempStart} <span className="text-neutral-600">→</span> {tempEnd}
                  </span>
                ) : tempStart ? (
                  <span className="text-indigo-400">Selecciona fecha final...</span>
                ) : (
                  <span className="text-neutral-500">Selecciona rango</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTempStart('');
                    setTempEnd('');
                    onChange('', '');
                    setIsOpen(false);
                  }}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-rose-400 transition-colors"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  disabled={!tempStart}
                  onClick={() => applyRange(tempStart, tempEnd || tempStart)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check size={13} />
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
