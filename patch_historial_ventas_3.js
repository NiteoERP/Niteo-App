const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

// Imports
if (!code.includes('toggleVentaVerificada')) {
  code = code.replace(
    "import { getHistorialVentasCompleto, HistorialVentaPOS } from '@/actions/pos-actions';",
    "import { getHistorialVentasCompleto, HistorialVentaPOS, toggleVentaVerificada } from '@/actions/pos-actions';"
  );
}
if (!code.includes('CheckCircle2')) {
  code = code.replace(
    "import { Search, Calendar, ChevronDown, ChevronUp, Receipt, Clock, CreditCard, Box } from 'lucide-react';",
    "import { Search, Calendar, ChevronDown, ChevronUp, Receipt, Clock, CreditCard, Box, CheckCircle2, Circle } from 'lucide-react';"
  );
}

// Stats for verified
code = code.replace(
  "const [busqueda, setBusqueda] = useState('');",
  "const [busqueda, setBusqueda] = useState('');\n  const totalVentas = ventas.length;\n  const verificadas = ventas.filter(v => v.verificado).length;\n  const isDiaVerificado = fechaFiltro && totalVentas > 0 && verificadas === totalVentas;"
);

// Add the badge to the header
const headerBadge = `
          {fechaFiltro && totalVentas > 0 && (
            <div className={\`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border \${isDiaVerificado ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}\`}>
              {isDiaVerificado ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              {isDiaVerificado ? 'DÍA VERIFICADO' : \`AUDITORÍA: \${verificadas}/\${totalVentas}\`}
            </div>
          )}
          <div className="flex gap-2">
`;

code = code.replace('<div className="flex gap-2">', headerBadge);

// Handle toggle function
code = code.replace(
  "const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });",
  `const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const handleToggleVerificado = async (e: React.MouseEvent, id: string, estadoActual: boolean) => {
    e.stopPropagation();
    const nuevoEstado = !estadoActual;
    // Optimistic update
    setVentas(prev => prev.map(v => v.id === id ? { ...v, verificado: nuevoEstado } : v));
    await toggleVentaVerificada(id, nuevoEstado);
  };
`
);

// Add the checkmark button to the row
const rowHeader = `
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800/30 transition-colors"
                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => handleToggleVerificado(e, v.id, !!v.verificado)}
                    className={\`p-1 rounded-full transition-colors \${v.verificado ? 'text-emerald-400 hover:text-emerald-300' : 'text-neutral-600 hover:text-neutral-400'}\`}
                    title={v.verificado ? "Desmarcar" : "Marcar como verificado"}
                  >
                    {v.verificado ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center shrink-0">
                    <Receipt className="text-indigo-400" size={20} />
                  </div>
`;

code = code.replace(
  /<div\s+className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800\/30 transition-colors"\s+onClick=\{\(\) => setExpandedId\(expandedId === v.id \? null : v.id\)\}\s*>\s*<div className="flex items-center gap-4">\s*<div className="w-10 h-10 bg-indigo-500\/10 rounded-full flex items-center justify-center shrink-0">\s*<Receipt className="text-indigo-400" size=\{20\} \/>\s*<\/div>/,
  rowHeader
);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
