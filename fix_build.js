const fs = require('fs'); 
const file = 'src/app/dashboard/proveedores/page.tsx'; 
let code = fs.readFileSync(file, 'utf8');

// Fix logic around line 1500
code = code.replace(
    /\{facturaTab === 'gastos' \? \([\s\S]*?\) : \([\s\S]*?Siguiente Paso: Cargar Ítems →<\/button>\s*<\/div>\s*\)\}\s*\{facStep === 2 && \(\<div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-12">[\s\S]*?<Package size=\{15\} className="text-indigo-400" \/> Insumos \/ Productos\s*<\/label>/,
    `{facturaTab === 'gastos' && (
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1.5">
                      Monto Total ({facMoneda === 'VES' ? 'Bolívares Bs.' : 'Dólares USD'}) *
                    </label>
                    <input type="number" min="0" step="any" value={facTotal} onChange={e => setFacTotal(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm font-semibold" />
                  </div>
                  {facMoneda === 'VES' && Number(facTotal) > 0 && facTasa > 0 && (
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex justify-between items-center text-indigo-300">
                      <span>Equivalente en Dólares (registrado como deuda):</span>
                      <span className="font-bold text-sm text-white">
                        $ {(Number(facTotal) / facTasa).toFixed(2)} USD
                      </span>
                    </div>
                  )}
                </div>
              )}
              {facturaTab === 'insumos' && (
                  <button type="button" onClick={() => setFacStep(2)} className="w-full mt-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">Siguiente Paso: Cargar Ítems →</button>
              )}
                </div>
              )}
              {facStep === 2 && facturaTab === 'insumos' && (<div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-12">
                  <div className="space-y-3 pt-2 border-t border-neutral-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-white flex items-center gap-2">
                        <Package size={15} className="text-indigo-400" /> Insumos / Productos
                      </label>`
);

// Fix Stepper Nav to only show when facturaTab === 'insumos'
code = code.replace(
    /\{\/\* NAVEGACIÓN TIPO STEPPER PARA MOBILE \*\/\}\s*<div className="flex bg-neutral-900\/90 backdrop-blur-md rounded-xl p-1 mb-6 sticky top-2 z-10 shadow-2xl shadow-black\/80 border border-neutral-800\/80">[\s\S]*?<\/div>/,
    `{/* NAVEGACIÓN TIPO STEPPER PARA MOBILE */}
              {facturaTab === 'insumos' && (
              <div className="flex bg-neutral-900/90 backdrop-blur-md rounded-xl p-1 mb-6 sticky top-2 z-10 shadow-2xl shadow-black/80 border border-neutral-800/80">
                <button type="button" onClick={() => setFacStep(1)} className={\`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all \${facStep === 1 ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white'}\`}>1. Datos Básicos</button>
                <button type="button" onClick={() => setFacStep(2)} className={\`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 \${facStep === 2 ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white'}\`}>2. Ítems & Factura {facDetalles.length > 0 && <span className={\`text-[10px] px-1.5 py-0.5 rounded-full \${facStep === 2 ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-400'}\`}>{facDetalles.length}</span>}</button>
              </div>
              )}`
);

// Also remove the `facStep === 1 &&` so that for "gastos" it is always visible.
// Wait! If facturaTab === 'gastos', we ALWAYS want step 1 visible, so we change:
// `{facStep === 1 && (<div className="space-y-6 animate-in fade-in slide-in-from-left-4">`
// to:
// `{(facStep === 1 || facturaTab === 'gastos') && (<div className="space-y-6 animate-in fade-in slide-in-from-left-4">`
code = code.replace(
    /\{facStep === 1 && \(\<div className="space-y-6 animate-in fade-in slide-in-from-left-4"\>/,
    `{(facStep === 1 || facturaTab === 'gastos') && (<div className="space-y-6 animate-in fade-in slide-in-from-left-4">`
);

fs.writeFileSync(file, code);
console.log('Script ejecutado con éxito');
