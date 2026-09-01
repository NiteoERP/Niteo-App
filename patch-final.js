const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

const startIdx = code.indexOf('function DesktopReportPanel({');
const endIdx = code.indexOf('function MiniBarChart({');

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `function DesktopReportPanel({
  report, sedes, sedeId, setSedeId,
  sheetStartDate, sheetEndDate, setSheetStartDate, setSheetEndDate,
  sheetDateKey, setSheetPreset,
  isLoading, reportData, reportError,
  categorias, cajeros, clientes, loadingFilters,
  categoriaFilter, setCategoriaFilter,
  cajeroFilter, setCajeroFilter,
  clienteFilter, setClienteFilter,
  onGenerate, onExport, onClose,
}: {
  report: Report;
  sedes: any[]; sedeId: string; setSedeId: (v: string) => void;
  sheetStartDate: Date; sheetEndDate: Date;
  setSheetStartDate: (d: Date) => void; setSheetEndDate: (d: Date) => void;
  sheetDateKey: DateRangeKey; setSheetPreset: (k: DateRangeKey) => void;
  isLoading: boolean; reportData: any[] | null; reportError: string;
  categorias: string[]; cajeros: {id:string;nombre:string}[]; clientes: {id:string;nombre:string}[];
  loadingFilters: boolean;
  categoriaFilter: string; setCategoriaFilter: (v:string)=>void;
  cajeroFilter: string; setCajeroFilter: (v:string)=>void;
  clienteFilter: string; setClienteFilter: (v:string)=>void;
  onGenerate: () => void; onExport: () => void; onClose: () => void;
}) {
  const group = REPORT_CATALOG.find(g => g.reports.some(r => r.id === report.id));
  const Icon  = report.icon;
  const [showCustomDates, setShowCustomDates] = useState(false);

  return (
    <div className="flex flex-col h-full bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0 bg-neutral-900 z-10">
        <div className="flex items-center gap-3">
          <div className={\`w-10 h-10 rounded-xl flex items-center justify-center border \${group?.bgColor ?? 'bg-neutral-800'}\`}>
            <Icon size={18} className={group?.color ?? 'text-neutral-400'} />
          </div>
          <div>
            <p className="font-bold text-white text-base">{report.name}</p>
            <p className="text-xs text-neutral-500">{report.desc}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden print:overflow-visible print:h-auto">
        {/* Columna Filtros */}
        <div className="w-72 border-r border-neutral-800 flex flex-col shrink-0 print:hidden h-full bg-neutral-950">
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
            {/* Sede */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Sucursal</label>
              <div className="relative">
                <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <select value={sedeId} onChange={e => setSedeId(e.target.value)}
                  className="w-full h-12 bg-neutral-900 border border-neutral-800 text-white text-sm pl-9 pr-3 rounded-xl appearance-none focus:outline-none focus:border-indigo-500">
                  <option value="ALL">Todas las sedes</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Filtros extra contextuales */}
            {loadingFilters && (
              <div className="flex items-center gap-2 text-neutral-500 text-xs">
                <Loader2 size={12} className="animate-spin" /> Cargando filtros...
              </div>
            )}
            {!loadingFilters && report.extraFilters?.includes('categoria') && categorias.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Categoría</label>
                <select value={categoriaFilter} onChange={e => setCategoriaFilter(e.target.value)}
                  className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl appearance-none focus:outline-none focus:border-indigo-500">
                  <option value="">Todas las categorías</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            {!loadingFilters && report.extraFilters?.includes('cajero') && cajeros.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Cajero / Empleado</label>
                <select value={cajeroFilter} onChange={e => setCajeroFilter(e.target.value)}
                  className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl appearance-none focus:outline-none focus:border-indigo-500">
                  <option value="">Todos los empleados</option>
                  {cajeros.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>
            )}
            {!loadingFilters && report.extraFilters?.includes('cliente') && clientes.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Cliente</label>
                <select value={clienteFilter} onChange={e => setClienteFilter(e.target.value)}
                  className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl appearance-none focus:outline-none focus:border-indigo-500">
                  <option value="">Todos los clientes</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}

            {/* Período */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Período</label>
              <div className="flex flex-wrap gap-2">
                {DATE_PILLS.map(pill => (
                  <button key={pill.key} onClick={() => { setSheetPreset(pill.key); setShowCustomDates(false); }}
                    className={\`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all \${
                      sheetDateKey === pill.key
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                    }\`}
                  >
                    {pill.label}
                  </button>
                ))}
                <button onClick={() => setShowCustomDates(!showCustomDates)}
                  className={\`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all \${
                    showCustomDates ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                  }\`}
                >
                  Personalizado
                </button>
              </div>
              {showCustomDates && (
                <div className="space-y-2 pt-1">
                  <input type="date" value={format(sheetStartDate, 'yyyy-MM-dd')}
                    onChange={e => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setSheetStartDate(d); }}
                    className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                  <input type="date" value={format(sheetEndDate, 'yyyy-MM-dd')}
                    onChange={e => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setSheetEndDate(d); }}
                    className="w-full h-10 bg-neutral-900 border border-neutral-800 text-white text-sm px-3 rounded-xl focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                </div>
              )}
              <p className="text-xs text-neutral-600">{format(sheetStartDate,'dd/MM/yy')} - {format(sheetEndDate,'dd/MM/yy')}</p>
            </div>
          </div>
          
          {/* Footer Fijo con el Botón */}
          <div className="p-5 border-t border-neutral-800 bg-neutral-900 shrink-0 space-y-3 z-10">
            <button onClick={onGenerate} disabled={isLoading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl
                         flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              {isLoading ? <><Loader2 size={16} className="animate-spin" /> Generando...</> : <><FileText size={16} /> Generar Documento</>}
            </button>
            {reportError && (
              <p className="text-rose-400 text-xs font-medium bg-rose-500/10 rounded-lg p-2 border border-rose-500/20">{reportError}</p>
            )}
          </div>
        </div>

        {/* Columna Resultados */}
        <div className="flex-1 overflow-x-auto overflow-y-auto print:overflow-visible print:h-auto custom-scrollbar p-6 bg-neutral-950">
          {!reportData && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-700 gap-3">
              <FileText size={48} className="opacity-20" />
              <p className="text-sm">Configura los filtros y selecciona un informe</p>
            </div>
          )}
          {isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-indigo-400 gap-3">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-sm text-neutral-500 animate-pulse">Generando reporte...</p>
            </div>
          )}
          {reportData && !isLoading && reportData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  {reportData.length} resultado{reportData.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ResultTable data={reportData} />
            </div>
          )}
          {reportData && !isLoading && reportData.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-700 gap-3">
              <p className="text-sm">No se encontraron resultados para los filtros seleccionados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Mini bar chart ---
`;

  // Actually, replace `// --- Mini bar chart ---` with just `\n\n` because we replaced up to `function MiniBarChart({`
  // Wait, I am slicing up to `function MiniBarChart({`. So I just append `\n` at the end.
  code = code.substring(0, startIdx) + replacement + "\n" + code.substring(endIdx);
}

// We also need to fix Mobile view just in case (remove Resumen Visual wrapper)
code = code.replace(
  /<div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">[\s\S]*?<\/div>[\s\S]*?<div className="space-y-2">/g,
  '<div className="space-y-2">'
);

// We still need to replace ResultCards with ResultTable across the file since git restore brought it back
code = code.replace(/<ResultCards data=\{reportData\} \/>/g, '<ResultTable data={reportData} />');

// And we still need to add ResultTable definition at the bottom if it doesn't exist
if (!code.includes('function ResultTable')) {
  code += `\n
function ResultTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;
  const keys = Object.keys(data[0]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative w-full">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50 border-b border-neutral-800">
            <tr>
              {keys.map((key, i) => (
                <th key={key} className={\`px-6 py-4 font-bold \${i === 0 ? 'sticky left-0 bg-neutral-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''}\`}>
                  {key.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-neutral-800/30 transition-colors">
                {keys.map((key, i) => {
                  const val = row[key];
                  const isNumber = typeof val === 'number';
                  return (
                    <td key={key} className={\`px-6 py-3 \${i === 0 ? 'font-medium text-white whitespace-nowrap sticky left-0 bg-neutral-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] z-10' : 'text-neutral-300'}\`}>
                      {isNumber ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(val ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;
}

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
