const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// 1. Fix the empty "Resumen Visual" wrapper in DesktopReportPanel
const emptyResumenRegex = /\{\/\* Mini grǭfico \*\/\}([\s\S]*?)<\!-- Tarjetas de resultados -->/g;
// Actually, it uses {/* Tarjetas de resultados */}
code = code.replace(
  /\{\/\* Mini grǭfico \*\/\}([\s\S]*?)\{\/\* Tarjetas de resultados \*\/\}/g,
  '{/* Resultados en Tabla */}\n'
);

// Do the same for the Mobile view (just in case)
code = code.replace(
  /<div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">[\s\S]*?<ResultTable data=\{reportData\} \/>/g,
  '<ResultTable data={reportData} />'
);

// 2. Fix the scrollbar and button layout in DesktopReportPanel
const desktopFiltrosColRegex = /\{\/\* Columna Filtros \*\/\}\s*<div className="w-72 border-r border-neutral-800 flex flex-col p-5 space-y-5 shrink-0 overflow-y-auto\s*print:overflow-visible print:h-auto">([\s\S]*?)\{\/\* Botn generar \*\/\}\s*<button onClick=\{onGenerate\}[\s\S]*?<\/button>\s*\{reportError && \(\s*<p[\s\S]*?<\/p>\s*\)\}\s*<\/div>/;

// Wait, the regex might fail due to special characters like Botn.
// Let's just find the start of the Columna Filtros
const splitStart = code.indexOf('{/* Columna Filtros */}');
if (splitStart !== -1) {
  const colStartRegex = /<div className="w-72 border-r border-neutral-800 flex flex-col p-5 space-y-5 shrink-0 overflow-y-auto\s*print:overflow-visible print:h-auto">/;
  code = code.replace(
    colStartRegex,
    '<div className="w-72 border-r border-neutral-800 flex flex-col shrink-0 print:hidden bg-neutral-950 h-full">\n<div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">'
  );
  
  // Now move the button and error to a footer
  const btnStart = code.indexOf('{/* Bot', splitStart); // matches {/* Botón generar */} or {/* Botn generar */}
  const divEnd = code.indexOf('</div>', code.indexOf('</button>', btnStart));
  
  if (btnStart !== -1 && divEnd !== -1) {
    // We want to close the flex-1 div right before the button, and put the button in a new div
    code = code.substring(0, btnStart) + '</div>\n<div className="p-5 border-t border-neutral-800 bg-neutral-900 shrink-0 space-y-3">\n' + code.substring(btnStart);
  }
}

// Ensure "Resumen Visual" string is completely gone if it didn't catch it
code = code.replace(/<p className="text-sm font-bold text-neutral-300">Resumen Visual<\/p>[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/g, '');

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
