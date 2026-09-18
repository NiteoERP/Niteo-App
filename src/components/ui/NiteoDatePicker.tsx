'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  getDay, addMonths, subMonths, isSameDay, parseISO, isValid 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

export interface NiteoDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  align?: 'left' | 'right';
  className?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
}

export default function NiteoDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Seleccionar fecha',
  align = 'left',
  className = '',
  disabled = false,
  minDate,
  maxDate
}: NiteoDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha seleccionada actual
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  }, [value]);

  // Mes visible en el calendario
  const [currentMonth, setCurrentMonth] = useState<Date>(() => selectedDate || new Date());

  // Actualizar mes si cambia la fecha seleccionada externamente
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

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

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOffset = useMemo(() => {
    return getDay(startOfMonth(currentMonth));
  }, [currentMonth]);

  const today = useMemo(() => new Date(), []);

  const handleSelectDay = (day: Date) => {
    const formatted = format(day, 'yyyy-MM-dd');
    onChange(formatted);
    setIsOpen(false);
  };

  const setQuickDate = (d: Date) => {
    const formatted = format(d, 'yyyy-MM-dd');
    onChange(formatted);
    setCurrentMonth(d);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 w-full bg-black/40 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white text-sm rounded-xl px-3.5 py-2.5 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm ${
          isOpen ? 'ring-1 ring-indigo-500 border-indigo-500/50 bg-neutral-900' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon size={16} className="text-indigo-400 shrink-0" />
          <span className={selectedDate ? 'text-white font-medium capitalize' : 'text-neutral-500'}>
            {selectedDate ? format(selectedDate, 'dd MMM yyyy', { locale: es }) : placeholder}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {selectedDate && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Limpiar fecha"
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
          } bg-neutral-900/95 backdrop-blur-xl border border-neutral-800/80 p-4 rounded-2xl shadow-2xl z-50 w-[310px] animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header con mes y flechas */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
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

          {/* Matriz de días */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`pad-${i}`} className="w-full h-8" />
            ))}
            {days.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isCurrentDay = isSameDay(day, today);

              const isOutOfRange = Boolean(
                (minDate && dayStr < minDate) || (maxDate && dayStr > maxDate)
              );

              return (
                <button
                  type="button"
                  key={dayStr}
                  disabled={isOutOfRange}
                  onClick={() => handleSelectDay(day)}
                  className={`relative flex items-center justify-center w-full h-8 text-xs font-medium rounded-lg transition-all ${
                    isOutOfRange
                      ? 'text-neutral-600 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <span>{format(day, 'd')}</span>
                  {isCurrentDay && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Accesos rápidos */}
          <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setQuickDate(new Date())}
                className="px-2.5 py-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-md font-medium transition-colors"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setQuickDate(y);
                }}
                className="px-2.5 py-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
              >
                Ayer
              </button>
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-neutral-500 hover:text-rose-400 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
