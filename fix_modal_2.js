const fs = require('fs'); 
const file = 'src/app/dashboard/proveedores/page.tsx'; 
let code = fs.readFileSync(file, 'utf8');

// Transformar el puente entre el paso 1 y 2 (Insumos / Productos)
code = code.replace(
    /<div className="space-y-3 pt-2 border-t border-neutral-800">\s*<div className="flex items-center justify-between">\s*<label className="block text-sm font-bold text-white flex items-center gap-2">\s*<Package size=\{15\} className="text-indigo-400" \/> Insumos \/ Productos/,
    `  <button type="button" onClick={() => setFacStep(2)} className="w-full mt-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">Siguiente Paso: Cargar Ítems →</button>
                </div>
              )}
              {facStep === 2 && (<div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-12">
                  <div className="space-y-3 pt-2 border-t border-neutral-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-white flex items-center gap-2">
                        <Package size={15} className="text-indigo-400" /> Insumos / Productos`
);

// Buscamos el boton de "Procesar Factura"
code = code.replace(
    /<button\s+type="button"\s+onClick=\{handleRegistrarFactura\}\s*disabled=\{cargandoFactura\}/,
    `</div>)}<button type="button" onClick={handleRegistrarFactura} disabled={cargandoFactura}`
);

fs.writeFileSync(file, code);
console.log('Script ejecutado con éxito');
