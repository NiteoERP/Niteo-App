const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');

code = code.replace(/const \[fechaFiltro, setFechaFiltro\] = useState\(''\);/, "const [fechaFiltro, setFechaFiltro] = useState('');\n  const [isCalendarOpen, setIsCalendarOpen] = useState(false);");

const newCalendar = `      <div className="relative z-20">
        <div className="flex justify-between items-center bg-black/40 border border-neutral-800 rounded-2xl p-4 md:p-6 mb-4">
          <div>
            <h3 className="text-white font-bold">Estado de Verificación</h3>
            <p className="text-xs text-neutral-400">Las ventas verdes han sido verificadas en el Cierre de Caja.</p>
          </div>
          <button 
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium border border-neutral-700"
          >
            <Calendar size={16} className="text-indigo-400" />
            {fechaFiltro ? format(parseISO(fechaFiltro), 'dd MMM yyyy', { locale: es }) : 'Seleccionar Fecha'}
            <ChevronDown size={14} className={\`transition-transform \${isCalendarOpen ? 'rotate-180' : ''}\`} />
          </button>
        </div>

        {isCalendarOpen && (
          <div className="absolute top-[80px] right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-2xl z-50 w-[340px] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-white capitalize">{format(calMonth, 'MMMM yyyy', { locale: es })}</p>
              </div>
              <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-neutral-600 uppercase py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => <div key={\`pad-\${i}\`} />)}
              {calDays.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const status = dayStatusMap.get(key) ?? 'empty';
                const isToday = isSameDay(day, today);
                const isSelected = fechaFiltro === key;

                let bgClass = 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400';
                if (status === 'verified') bgClass = 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30';
                else if (status === 'partial') bgClass = 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30';

                return (
                  <button
                    key={key}
                    onClick={() => {
                      setFechaFiltro(isSelected ? '' : key);
                      setIsCalendarOpen(false);
                    }}
                    className={\`relative text-center text-xs font-medium py-1.5 rounded-lg transition-all \${bgClass} \${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-neutral-900' : ''} \${isToday ? 'font-bold' : ''}\`}
                  >
                    {format(day, 'd')}
                    {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> OK</span>
              <span className="flex items-center gap-1 text-[10px] text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Parcial</span>
              <span className="flex items-center gap-1 text-[10px] text-neutral-500"><span className="w-1.5 h-1.5 rounded-full bg-neutral-700 inline-block" /> Vacío</span>
            </div>
          </div>
        )}
      </div>`;

// Use regex matching up to the end of the previous calendar
code = code.replace(
  /<div className="bg-black\/40 border border-neutral-800 rounded-2xl p-4 md:p-6">[\s\S]*?<\/div>\n      <\/div>/,
  newCalendar
);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code);
