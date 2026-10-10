const fs = require('fs');
const file = 'src/app/dashboard/proveedores/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Aumentar gap en la sección de Proveedor y Sede
code = code.replace(
    /<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">/,
    '<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">'
);

// Cambiar la grilla de N Factura, Fecha, Vencimiento a columna única en móvil
code = code.replace(
    /<div className="grid grid-cols-3 gap-3">/,
    '<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">'
);

// Cambiar la grilla de Concepto y Moneda
code = code.replace(
    /<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">/,
    '<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">'
);

// Condicionar la vista de "Estado / Método de Pago"
code = code.replace(
    /<div>\s*<label className="block text-sm text-neutral-400 mb-1\.5 mt-2">Estado \/ Método de Pago<\/label>/,
    `{(facStep === 2 || facturaTab === 'gastos') && (
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5 mt-2">Estado / Método de Pago</label>`
);

// Envolver también el cierre y el botón de submit para el Stepper
// Buscamos el cierre de <AlertCircle size={14} /> {errorFactura}</p>} y el </div> del contenido principal
// y el footer
code = code.replace(
    /\{errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size=\{14\} \/> \{errorFactura\}<\/p>\}\s*<\/div>\s*<div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">\s*<button onClick=\{\(\) => setShowFacturaModal\(false\)\} className="px-5 py-2.5 rounded-xl text-neutral-300 hover:bg-neutral-800 text-sm">Cancelar<\/button>\s*<button onClick=\{handleCrearFactura\} disabled=\{enviandoFactura\}\s*className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">\s*\{enviandoFactura \? 'Registrando\.\.\.' : <><FileText size=\{16\} \/> Registrar Factura<\/>\}\s*<\/button>\s*<\/div>/,
    `{errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
              )}
            </div>
              <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end bg-neutral-900/80 backdrop-blur-sm sticky bottom-0 z-20">
                <button onClick={() => setShowFacturaModal(false)} className="px-5 py-2.5 rounded-xl text-neutral-300 hover:bg-neutral-800 text-sm">Cancelar</button>
                {(facStep === 2 || facturaTab === 'gastos') ? (
                  <button onClick={handleCrearFactura} disabled={enviandoFactura}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
                    {enviandoFactura ? 'Registrando...' : <><FileText size={16} /> Registrar Factura</>}
                  </button>
                ) : (
                  <button onClick={() => setFacStep(2)} type="button" className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
                    Siguiente Paso →
                  </button>
                )}
              </div>`
);

fs.writeFileSync(file, code);
console.log('UI spacing and stepper fixes applied.');
