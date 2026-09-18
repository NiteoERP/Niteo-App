'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, addMonths, subMonths, subWeeks, subYears, isSameDay, 
  isSameMonth, parseISO, isValid, subDays, startOfYear, endOfYear
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
  placeholder = 'Seleccionar período',
  align = 'right',
  className = '',
  disabled = false
}: NiteoDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fechas temporales dentro del modal
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);

  // Meses mostrados en los dos calendarios
  const [monthStart, setMonthStart] = useState<Date>(() => {
    if (startDate) {
      const p = parseISO(startDate);
      if (isValid(p)) return p;
    }
    return new Date();
  });

  const [monthEnd, setMonthEnd] = useState<Date>(() => {
    if (endDate) {
      const p = parseISO(endDate);
      if (isValid(p)) return p;
    }
    return new Date();
  });

  // Sincronizar cuando se abre el modal o cambian props
  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      if (startDate) {
        const p = parseISO(startDate);
        if (isValid(p)) setMonthStart(p);
      }
      if (endDate) {
        const p = parseISO(endDate);
        if (isValid(p)) setMonthEnd(p);
      }
    }
  }, [isOpen, startDate, endDate]);

  // Bloquear scroll de fondo y escuchar tecla Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const today = useMemo(() => new Date(), []);

  // Generador de matriz de 42 días (6 semanas) empezando en Lunes
  const generateMonthGrid = (viewDate: Date) => {
    const mStart = startOfMonth(viewDate);
    const gridStart = startOfWeek(mStart, { weekStartsOn: 1 });
    const days: Date[] = [];
    let cur = gridStart;
    for (let i = 0; i < 42; i++) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  };

  const daysStartGrid = useMemo(() => generateMonthGrid(monthStart), [monthStart]);
  const daysEndGrid = useMemo(() => generateMonthGrid(monthEnd), [monthEnd]);

  // Manejo de clic en día del calendario "Inicio"
  const handleSelectStartDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    setTempStart(dayStr);
    if (!isSameMonth(day, monthStart)) {
      setMonthStart(day);
    }
    if (tempEnd && dayStr > tempEnd) {
      setTempEnd(dayStr);
      setMonthEnd(day);
    }
  };

  // Manejo de clic en día del calendario "Fin"
  const handleSelectEndDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    setTempEnd(dayStr);
    if (!isSameMonth(day, monthEnd)) {
      setMonthEnd(day);
    }
    if (tempStart && dayStr < tempStart) {
      setTempStart(dayStr);
      setMonthStart(day);
    }
  };

  // Presets predefinidos estilo Aronium
  const applyPreset = (type: 'hoy' | 'ayer' | 'estaSemana' | 'ultimaSemana' | 'esteMes' | 'ultimoMes' | 'esteAno' | 'ultimoAno') => {
    const now = new Date();
    let s = '';
    let e = '';

    switch (type) {
      case 'hoy': {
        s = format(now, 'yyyy-MM-dd');
        e = s;
        break;
      }
      case 'ayer': {
        const y = subDays(now, 1);
        s = format(y, 'yyyy-MM-dd');
        e = s;
        break;
      }
      case 'estaSemana': {
        s = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        e = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      }
      case 'ultimaSemana': {
        const prevW = subWeeks(now, 1);
        s = format(startOfWeek(prevW, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        e = format(endOfWeek(prevW, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      }
      case 'esteMes': {
        s = format(startOfMonth(now), 'yyyy-MM-dd');
        e = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      }
      case 'ultimoMes': {
        const prevM = subMonths(now, 1);
        s = format(startOfMonth(prevM), 'yyyy-MM-dd');
        e = format(endOfMonth(prevM), 'yyyy-MM-dd');
        break;
      }
      case 'esteAno': {
        s = format(startOfYear(now), 'yyyy-MM-dd');
        e = format(endOfYear(now), 'yyyy-MM-dd');
        break;
      }
      case 'ultimoAno': {
        const prevY = subYears(now, 1);
        s = format(startOfYear(prevY), 'yyyy-MM-dd');
        e = format(endOfYear(prevY), 'yyyy-MM-dd');
        break;
      }
    }

    setTempStart(s);
    setTempEnd(e);
    if (s) setMonthStart(parseISO(s));
    if (e) setMonthEnd(parseISO(e));
  };

  const handleConfirm = () => {
    if (tempStart) {
      onChange(tempStart, tempEnd || tempStart);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  // Texto amigable para el botón activador
  const triggerLabel = useMemo(() => {
    if (!startDate && !endDate) return placeholder;
    const sDate = startDate ? parseISO(startDate) : null;
    const eDate = endDate ? parseISO(endDate) : null;

    if (sDate && eDate && isValid(sDate) && isValid(eDate)) {
      if (startDate === endDate) {
        return format(sDate, 'd/M/yyyy');
      }
      return `${format(sDate, 'd/M/yyyy')} - ${format(eDate, 'd/M/yyyy')}`;
    }
    if (sDate && isValid(sDate)) return `Desde ${format(sDate, 'd/M/yyyy')}`;
    if (eDate && isValid(eDate)) return `Hasta ${format(eDate, 'd/M/yyyy')}`;
    return placeholder;
  }, [startDate, endDate, placeholder]);

  // Pill formateado en la cabecera del modal
  const pillDisplay = useMemo(() => {
    if (!tempStart) return 'Seleccione fecha de inicio';
    const sDate = parseISO(tempStart);
    const eDate = tempEnd ? parseISO(tempEnd) : sDate;
    if (isValid(sDate) && isValid(eDate)) {
      return `${format(sDate, 'd/M/yyyy')} - ${format(eDate, 'd/M/yyyy')}`;
    }
    return tempStart;
  }, [tempStart, tempEnd]);

  const weekdays = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];

  return (
    <div className={`relative inline-block ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {/* Botón activador en la casilla de fecha */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={`flex items-center justify-between gap-3 bg-black/40 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white text-sm rounded-xl px-4 py-2.5 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm ${
          isOpen ? 'ring-1 ring-indigo-500 border-indigo-500/50 bg-neutral-900' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon size={16} className="text-indigo-400 shrink-0" />
          <span className={startDate || endDate ? 'text-white font-medium' : 'text-neutral-500'}>
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

      {/* MODAL DIALOG estilo Aronium con temática Niteo */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-2xl max-w-4xl w-full text-white animate-in zoom-in-95 duration-150 overflow-y-auto max-h-[95vh] cursor-default relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar X en la esquina */}
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
              title="Cerrar (Esc)"
            >
              <X size={18} />
            </button>

            {/* Header: Período y Pill central */}
            <div className="text-center mb-6 pr-8 pl-8">
              <h2 className="text-lg font-bold text-neutral-200 mb-2">Período</h2>
              <div className="inline-block bg-indigo-600 text-white font-bold text-sm px-6 py-1.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.35)]">
                {pillDisplay}
              </div>
            </div>

            {/* Layout principal: 2 Calendarios + Período predefinido */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              
              {/* Calendario 1: INICIO */}
              <div className="md:col-span-4 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
                <h3 className="text-center text-sm font-semibold text-neutral-300 mb-2">Inicio</h3>
                
                {/* Header de mes */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <button
                    type="button"
                    onClick={() => setMonthStart(subMonths(monthStart, 1))}
                    className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-semibold text-white capitalize">
                    {format(monthStart, 'MMMM yyyy', { locale: es })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMonthStart(addMonths(monthStart, 1))}
                    className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Días de la semana */}
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-neutral-400 mb-1">
                  {weekdays.map((d) => (
                    <div key={d} className="py-1">{d}</div>
                  ))}
                </div>

                {/* Grilla 42 días */}
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {daysStartGrid.map((day, idx) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const inCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected = tempStart === dayStr;
                    const isCurDay = isSameDay(day, today);

                    return (
                      <div key={`start-${dayStr}-${idx}`} className="flex items-center justify-center p-0.5">
                        <button
                          type="button"
                          onClick={() => handleSelectStartDay(day)}
                          className={`w-7 h-7 text-xs font-medium rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                              : isCurDay
                              ? 'border border-indigo-400 text-indigo-300'
                              : inCurrentMonth
                              ? 'text-neutral-200 hover:bg-neutral-800'
                              : 'text-neutral-600 hover:text-neutral-400'
                          }`}
                        >
                          {format(day, 'd')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calendario 2: FIN */}
              <div className="md:col-span-4 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
                <h3 className="text-center text-sm font-semibold text-neutral-300 mb-2">Fin</h3>
                
                {/* Header de mes */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <button
                    type="button"
                    onClick={() => setMonthEnd(subMonths(monthEnd, 1))}
                    className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-semibold text-white capitalize">
                    {format(monthEnd, 'MMMM yyyy', { locale: es })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMonthEnd(addMonths(monthEnd, 1))}
                    className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Días de la semana */}
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-neutral-400 mb-1">
                  {weekdays.map((d) => (
                    <div key={d} className="py-1">{d}</div>
                  ))}
                </div>

                {/* Grilla 42 días */}
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {daysEndGrid.map((day, idx) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const inCurrentMonth = isSameMonth(day, monthEnd);
                    const isSelected = tempEnd === dayStr;
                    const isCurDay = isSameDay(day, today);

                    return (
                      <div key={`end-${dayStr}-${idx}`} className="flex items-center justify-center p-0.5">
                        <button
                          type="button"
                          onClick={() => handleSelectEndDay(day)}
                          className={`w-7 h-7 text-xs font-medium rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                              : isCurDay
                              ? 'border border-indigo-400 text-indigo-300'
                              : inCurrentMonth
                              ? 'text-neutral-200 hover:bg-neutral-800'
                              : 'text-neutral-600 hover:text-neutral-400'
                          }`}
                        >
                          {format(day, 'd')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Columna 3: PERÍODO PREDEFINIDO */}
              <div className="md:col-span-4 flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-center text-sm font-semibold text-neutral-300 mb-3">
                    Período predefinido
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset('hoy')}
                      className="bg-neutral-800/80 hover:bg-neutral-700 hover:text-white border border-neutral-700/80 text-neutral-300 text-xs py-2.5 px-3 rounded-lg text-center transition-colors"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('ayer')}
                      className="bg-neutral-800/80 hover:bg-neutral-700 hover:text-white border border-neutral-700/80 text-neutral-300 text-xs py-2.5 px-3 rounded-lg text-center transition-colors"
                    >
                      Ayer
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('estaSemana')}
                      className="bg-neutral-800/80 hover:bg-neutral-700 hover:text-white border border-neutral-700/80 text-neutral-300 text-xs py-2.5 px-3 rounded-lg text-center transition-colors"
                    >
                      Esta semana
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('ultimaSemana')}
                      className="bg-neutral-800/80 hover:bg-neutral-700 hover:text-white border border-neutral-700/80 text-neutral-300 text-xs py-2.5 px-3 rounded-lg text-center transition-colors"
                    >
                      Última semana
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('esteMes')}
                      className="bg-neutral-800/80 hover:bg-neutral-700 hover:text-white border border-neutral-700/80 text-neutral-300 text-xs py-2.5 px-3 rounded-lg text-center transition-colors"
                    >
                      Este mes
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('ultimoMes')}
                      className="bg-neutral-800/80 hover:bg-neutral-700 hover:text-white border border-neutral-700/80 text-neutral-300 text-xs py-2.5 px-3 rounded-lg text-center transition-colors"
                    >
                      Último mes
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('esteAno')}
                      className="bg-neutral-800/80 hover:bg-neutral-700 hover:text-white border border-neutral-700/80 text-neutral-300 text-xs py-2.5 px-3 rounded-lg text-center transition-colors"
                    >
                      Este año
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('ultimoAno')}
                      className="bg-neutral-800/80 hover:bg-neutral-700 hover:text-white border border-neutral-700/80 text-neutral-300 text-xs py-2.5 px-3 rounded-lg text-center transition-colors"
                    >
                      Último año
                    </button>
                  </div>
                </div>

                {/* Botones de acción Ok / Cancelar */}
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                  >
                    <Check size={15} /> Ok
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <X size={15} /> Cancelar
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
