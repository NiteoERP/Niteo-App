const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// 1. Remove the empty "Resumen Visual" div completely.
code = code.replace(
  /\{\/\* Mini grǭfico \*\/\}\s*<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">\s*<div className="flex items-center justify-between mb-4">\s*<\/div>\s*<\/div>/g,
  ''
);

code = code.replace(
  /\{\/\* Mini grǭfico \*\/\}\s*<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">\s*<div className="flex items-center justify-between mb-4">[\s\S]*?<\/div>[\s\S]*?<\/div>/g,
  ''
);

// We want the whole `Columna Resultados` to be extremely clean.
const searchForResults = `{/* Columna Resultados */}`;
const startIndex = code.indexOf(searchForResults);
if (startIndex !== -1) {
  // Let's replace the whole block up to `);` of the DesktopReportPanel
  const endIndex = code.indexOf('    </div>\n  );\n}', startIndex);
  if (endIndex !== -1) {
    const cleanResults = `{/* Columna Resultados */}
        <div className="flex-1 overflow-x-auto overflow-y-auto print:overflow-visible print:h-auto custom-scrollbar p-6 bg-neutral-950">
          {!reportData && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-700 gap-3">
              <FileText size={48} className="opacity-20" />
              <p className="text-sm">Configura los filtros y selecciona un informe</p>
            </div>
          )}
          {isLoading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
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
        </div>`;
    code = code.substring(0, startIndex) + cleanResults + code.substring(endIndex);
  }
}

// 2. Fix the scroll and button placement for DesktopReportPanel filters
// We need the filters to be `flex-1 overflow-y-auto custom-scrollbar p-5`
// And the button to be in a fixed `p-5 border-t bg-neutral-900` at the bottom.

const filterColStart = `<div className="w-72 border-r border-neutral-800 flex flex-col p-5 space-y-5 shrink-0 overflow-y-auto \nprint:overflow-visible print:h-auto">`;
const newFilterColStart = `<div className="w-72 border-r border-neutral-800 flex flex-col shrink-0 bg-neutral-950 h-full print:hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">`;

code = code.replace(
  /<div className="w-72 border-r border-neutral-800 flex flex-col p-5 space-y-5 shrink-0 overflow-y-auto\s*print:overflow-visible print:h-auto">/,
  newFilterColStart
);

// If it's already using the h-full version from a previous partial patch:
code = code.replace(
  /<div className="w-72 border-r border-neutral-800 flex flex-col shrink-0 print:hidden bg-neutral-950 h-full">\s*<div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">/g,
  newFilterColStart
);

// Now we need to isolate the "Generar Documento" button and put it in a footer
const btnSearch = `{/* Botón generar */}`; // or similar
const btnIdx = code.indexOf(btnSearch);
// Actually, it might be `{/* Botn generar */}` due to encoding issues
const buttonMatch = code.match(/\{\/\* Bot.n generar \*\/\}\s*<button[\s\S]*?<\/button>\s*(\{reportError && \([\s\S]*?<\/div>\s*\)\})?/);

if (buttonMatch) {
  // We found the button (and optionally the error block).
  const buttonBlock = buttonMatch[0];
  code = code.replace(buttonBlock, '');
  
  // We need to insert the button block AT THE END of the filter column, closing the scrollable div first.
  // The filter column ends right before `{/* Columna Resultados */}`
  const resultsIdx = code.indexOf('{/* Columna Resultados */}');
  if (resultsIdx !== -1) {
    const newFooter = `</div>
          <div className="p-5 border-t border-neutral-800 bg-neutral-900 shrink-0 space-y-3">
            ${buttonBlock}
          </div>
          `;
    code = code.substring(0, resultsIdx) + newFooter + code.substring(resultsIdx);
  }
}


fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
