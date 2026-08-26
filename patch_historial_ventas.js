const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

// Update empty state text
code = code.replace(
  "No hay ventas registradas {fechaFiltro ? 'en esta fecha' : 'recientemente'}.",
  "No hay ventas registradas {fechaFiltro ? 'hasta esta fecha' : 'recientemente'}."
);

// Add custom CSS class to make date picker icon stretch over the whole input to act as a clickable area
const oldInput = `<input 
              type="date" 
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="bg-black/40 border border-neutral-800 text-neutral-300 text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none"
            />`;

const newInput = `<input 
              type="date" 
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              title="Seleccionar fecha"
              className="relative bg-black/40 border border-neutral-800 text-neutral-300 text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-black/60 w-[150px] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" size={16} />`;

code = code.replace(oldInput, newInput);
fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
