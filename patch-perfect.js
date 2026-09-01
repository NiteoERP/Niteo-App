const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// Mobile Replace:
const mobileStart = `{/* ?" Mini grǭfico placeholder ?" */}`;
const mobileEnd = `</>
      )}

      {/*  ? ? ? ? ? ? ? ? ?`;

// We will replace the block from mobileStart down to the error block
const mobileSliceStart = code.indexOf(mobileStart);
const mobileSliceEnd = code.indexOf('{/* ?" Error ?" */}', mobileSliceStart);

if (mobileSliceStart !== -1 && mobileSliceEnd !== -1) {
  const newMobileBlock = `{/* Resultados */}
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
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center justify-center text-neutral-700 gap-3">
                  <p className="text-sm">No se encontraron resultados.</p>
                </div>
              )}

              `;
  code = code.substring(0, mobileSliceStart) + newMobileBlock + code.substring(mobileSliceEnd);
}

// Desktop Replace:
const desktopFiltrosStart = code.indexOf('{/* Columna Filtros */}');
const desktopResultsEnd = code.indexOf('    </div>\n  );\n}', desktopFiltrosStart);

if (desktopFiltrosStart !== -1 && desktopResultsEnd !== -1) {
  // Extract everything from filters start to the button
  const startToButton = code.substring(desktopFiltrosStart, desktopResultsEnd);
  
  // Replace the filter container to include custom scrollbar and fixed footer
  let modifiedDesktop = startToButton;
  
  modifiedDesktop = modifiedDesktop.replace(
    /<div className="w-72 border-r border-neutral-800 flex flex-col p-5 space-y-5 shrink-0 overflow-y-auto\s*print:overflow-visible print:h-auto">/,
    `<div className="w-72 border-r border-neutral-800 flex flex-col shrink-0 bg-neutral-950 h-full print:hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">`
  );
  
  // Button extraction
  const btnStartMatch = modifiedDesktop.match(/\{\/\* Bot.n generar \*\/\}/);
  if (btnStartMatch) {
    const btnStartIndex = btnStartMatch.index;
    const btnEndIndex = modifiedDesktop.indexOf('</div>', btnStartIndex);
    
    const blockToMove = modifiedDesktop.substring(btnStartIndex, btnEndIndex);
    
    // We remove the block from its current location, and close the scrollable div
    modifiedDesktop = modifiedDesktop.substring(0, btnStartIndex) + `</div>
          <div className="p-5 border-t border-neutral-800 bg-neutral-900 shrink-0 space-y-3 z-10">
            ${blockToMove}
          </div>
`;
    
    // Now for Columna Resultados
    const resultsStart = modifiedDesktop.indexOf('{/* Columna Resultados */}');
    if (resultsStart !== -1) {
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
      
      modifiedDesktop = modifiedDesktop.substring(0, resultsStart) + newResults;
    }
  }

  code = code.substring(0, desktopFiltrosStart) + modifiedDesktop + code.substring(desktopResultsEnd);
}

// Remove old ResultCards and MiniBarChart definitions if they exist
code = code.replace(/\/\/ "\?"\?"\? Mini gr.fico[\s\S]*?function MiniBarChart[\s\S]*?\}\s*\}\s*\/\/ "\?"\?"\? Tarjetas de resultados[\s\S]*?function ResultCards[\s\S]*?\}\s*\}/, '');

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
