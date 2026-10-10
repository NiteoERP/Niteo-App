const fs = require('fs'); 
const file = 'src/app/dashboard/proveedores/page.tsx'; 
let code = fs.readFileSync(file, 'utf8');

// Añadir facStep al estado
if (!code.includes('const [facStep')) {
    code = code.replace(
        'const [showFacturaModal, setShowFacturaModal] = useState(false);',
        'const [showFacturaModal, setShowFacturaModal] = useState(false);\n  const [facStep, setFacStep] = useState(1);'
    );
}

// Transformar la parte superior de "Campos comunes"
code = code.replace(
    /<div className="p-6 space-y-4 pt-4">\s*{\/\* Campos comunes \(siempre visibles\) \*\/}/,
    `<div className="p-6 space-y-4 pt-4 pb-24">
              {/* NAVEGACIÓN TIPO STEPPER PARA MOBILE */}
              <div className="flex bg-neutral-900/90 backdrop-blur-md rounded-xl p-1 mb-6 sticky top-2 z-10 shadow-2xl shadow-black/80 border border-neutral-800/80">
                <button type="button" onClick={() => setFacStep(1)} className={\`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all \${facStep === 1 ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white'}\`}>1. Datos Básicos</button>
                <button type="button" onClick={() => setFacStep(2)} className={\`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 \${facStep === 2 ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white'}\`}>2. Ítems & Factura {facDetalles.length > 0 && <span className={\`text-[10px] px-1.5 py-0.5 rounded-full \${facStep === 2 ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-400'}\`}>{facDetalles.length}</span>}</button>
              </div>
              {facStep === 1 && (<div className="space-y-6 animate-in fade-in slide-in-from-left-4">
              {/* Campos comunes (siempre visibles) */}`
);

// Transformar el puente entre el paso 1 y 2 (Insumos / Productos)
code = code.replace(
    /<div className="space-y-3 pt-2 border-t border-neutral-800">\s*<div className="flex items-center justify-between">\s*<label className="block text-sm font-bold text-white flex items-center gap-2">\s*<Package size={15} className="text-indigo-400" \/> Insumos \/ Productos/,
    `  <button type="button" onClick={() => setFacStep(2)} className="w-full mt-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">Siguiente Paso: Cargar Insumos →</button>
                </div>
              )}
              {facStep === 2 && (<div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-12">
                  <div className="space-y-3 pt-2 border-t border-neutral-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-white flex items-center gap-2">
                        <Package size={15} className="text-indigo-400" /> Insumos / Productos`
);

// Tenemos que cerrar el facStep === 2 al final del modal.
// Buscamos el boton de "Procesar Factura"
code = code.replace(
    /<button type="button" onClick={handleRegistrarFactura}\s*disabled={cargandoFactura}/,
    `</div>)}<button type="button" onClick={handleRegistrarFactura} disabled={cargandoFactura}`
);

fs.writeFileSync(file, code);
console.log('Script ejecutado con éxito');
