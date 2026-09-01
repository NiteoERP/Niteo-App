const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// Fix Columna Filtros start (adding custom-scrollbar and isolating the scroll area)
const oldFiltrosStart = `<div className="w-72 border-r border-neutral-800 flex flex-col p-5 space-y-5 shrink-0 overflow-y-auto 
print:overflow-visible print:h-auto">`;

const newFiltrosStart = `<div className="w-72 border-r border-neutral-800 flex flex-col shrink-0 bg-neutral-950 h-full print:hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">`;

code = code.replace(oldFiltrosStart, newFiltrosStart);
code = code.replace(oldFiltrosStart.replace(/\n/g, '\n          '), newFiltrosStart);
code = code.replace(/<div className="w-72 border-r border-neutral-800 flex flex-col p-5 space-y-5 shrink-0 overflow-y-auto\s*print:overflow-visible print:h-auto">/g, newFiltrosStart);

// Fix Columna Filtros end (extracting button to footer)
// In DesktopReportPanel, the button starts with {/* Botón generar */}
const btnSearchStr = `{/* Botón generar */}`;
const btnIndex = code.lastIndexOf(btnSearchStr);

if (btnIndex !== -1) {
  // Find the closing div for the entire column which is before {/* Columna Resultados */}
  const resultsIdx = code.indexOf('{/* Columna Resultados */}');
  
  if (resultsIdx !== -1) {
    // The code block to move is between btnIndex and resultsIdx
    let blockToMove = code.substring(btnIndex, resultsIdx);
    
    // It currently ends with "        </div>\n\n\n        " (the closing div of the filter col)
    // We want to change the structure.
    blockToMove = blockToMove.replace(/<\/div>\s*$/, ''); // remove the closing div of the column
    
    const newFooter = `</div>
          {/* Footer Fijo */}
          <div className="p-5 border-t border-neutral-800 bg-neutral-900 shrink-0 space-y-3 z-10">
            ${blockToMove}
          </div>
`;
    
    code = code.substring(0, btnIndex) + newFooter + code.substring(resultsIdx);
  }
}


// Replace Columna Resultados entirely
const resultsStart = code.indexOf('{/* Columna Resultados */}');
const resultsEnd = code.indexOf('    </div>\n  );\n}', resultsStart);

if (resultsStart !== -1 && resultsEnd !== -1) {
  const newResults = `{/* Columna Resultados */}
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
      </div>`;
      
  code = code.substring(0, resultsStart) + newResults + code.substring(resultsEnd);
}

// Remove the Resumen Visual box from Mobile view as well (if present)
// Mobile view is around line 430+
const mobileResumen = /\{\/\* Mini gr.fico placeholder \*\/\}\s*<div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">[\s\S]*?<\/div>[\s\S]*?\{\/\* Resultados en tarjetas \*\/\}/g;
code = code.replace(mobileResumen, '{/* Resultados */}');


fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
