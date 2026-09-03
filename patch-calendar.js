const fs = require('fs');

let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');

// 1. Fix the Realtime listener so it doesn't cause loading flickers
code = code.replace(
  /cargarVentas\(\);\s*getHistorialVentasCompleto\(sedeId\)\.then\(setAllMonthVentas\);/g,
  `getHistorialVentasCompleto(sedeId, fechaFiltro || undefined).then(data => setVentas(data));
        getHistorialVentasCompleto(sedeId).then(setAllMonthVentas);`
);

// 2. Hide the giant calendar and put it inside a popover
const calendarHtml = `<div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-white capitalize">{format(calMonth, 'MMMM yyyy', { locale: es })}</p>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Verificado</span>
              <span className="flex items-center gap-1 text-xs text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Parcial</span>
              <span className="flex items-center gap-1 text-xs text-neutral-500"><span className="w-2 h-2 rounded-full bg-neutral-700 inline-block" /> Sin ventas</span>
            </div>
          </div>
          <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['Dom', 'Lun', 'Mar', 'MiǸ', 'Jue', 'Vie', 'Sǭb'].map(d => (
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

            let bgClass = 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400';
            if (status === 'verified') bgClass = 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30';
            else if (status === 'partial') bgClass = 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30';

            return (
              <button
                key={key}
                onClick={() => setFechaFiltro(isSelected ? '' : key)}
                className={\`relative text-center text-xs font-medium py-1.5 rounded-lg transition-all \${bgClass} \${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-neutral-950' : ''} \${isToday ? 'font-bold' : ''}\`}
              >
                {format(day, 'd')}
                {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />}
              </button>
            );
          })}
        </div>
      </div>`;

// Wait, the string in the file has actual accents or some weird encoding for 'MiǸ' and 'Sǭb'. 
// I'll just use a regex block replacement to be safe.
code = code.replace(/<div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '{/* CALENDAR REMOVED FROM HERE */}');

// And we will inject the calendar dropdown into the controls section
const controlsSearch = `<div className="relative">
            <input 
              type="date" 
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              title="Seleccionar fecha"
              className="relative bg-neutral-900 border border-neutral-800 text-white text-sm rounded-lg pl-3 pr-10 py-2.5 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-neutral-800 [color-scheme:dark] w-[150px] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer transition-colors"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={16} />
          </div>`;

const newControls = `<div className="relative">
            <button 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 text-white text-sm rounded-lg pl-4 pr-3 py-2.5 hover:bg-neutral-800 transition-colors min-w-[160px]"
            >
              <span>{fechaFiltro ? format(parseISO(fechaFiltro), "dd MMM yyyy", { locale: es }) : 'Todas las fechas'}</span>
              <Calendar className="text-indigo-400" size={16} />
            </button>
            
            {isCalendarOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-72 md:w-80 shadow-2xl">
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
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
                    {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
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

                      let bgClass = 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400';
                      if (status === 'verified') bgClass = 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30';
                      else if (status === 'partial') bgClass = 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30';

                      return (
                        <button
                          key={key}
                          onClick={() => { setFechaFiltro(isSelected ? '' : key); setIsCalendarOpen(false); }}
                          className={\`relative text-center text-xs font-medium py-1.5 rounded-lg transition-all \${bgClass} \${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-neutral-950' : ''} \${isToday ? 'font-bold' : ''}\`}
                        >
                          {format(day, 'd')}
                          {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-neutral-800/50">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> OK</span>
                    <span className="flex items-center gap-1 text-[10px] text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Parcial</span>
                  </div>
                </div>
              </div>
            )}
          </div>`;

code = code.replace(controlsSearch, newControls);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code);
