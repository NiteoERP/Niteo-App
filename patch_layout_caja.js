const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf8');

// 1. Replace the root wrapper and Header
const oldHeaderRegex = /<div className="min-h-screen bg-black text-white pb-32 animate-in fade-in duration-500">[\s\S]*?{/\* HEADER \*\/}[\s\S]*?<div className="p-6 md:p-8 bg-neutral-950 border-b border-neutral-900 sticky top-0 z-20">[\s\S]*?<div className="max-w-2xl mx-auto flex justify-between items-center">[\s\S]*?<div>[\s\S]*?<h1 className="text-2xl font-bold tracking-tight">Cierre de Caja<\/h1>[\s\S]*?<p className="text-neutral-400 text-sm mt-1">Tasa BCV: <span className="text-emerald-400 font-medium">{tasaCambio\.toFixed\(2\)} Bs\/\$<\/span><\/p>[\s\S]*?<\/div>[\s\S]*?<div className="text-right hidden sm:block">[\s\S]*?<p className="text-xs text-neutral-500 uppercase tracking-widest">Venta del Sistema<\/p>[\s\S]*?<p className="text-xl font-bold text-neutral-300">\\<\/p>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const newHeader = \
    <div className="animate-in fade-in duration-500 space-y-6 pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cierre de Caja</h1>
          <p className="text-neutral-400 text-sm mt-1">Tasa BCV: <span className="text-emerald-400 font-medium">{tasaCambio.toFixed(2)} Bs/$</span></p>
        </div>
        <div className="text-right hidden sm:block bg-black/40 px-6 py-3 rounded-xl border border-neutral-800">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Venta del Sistema</p>
          <p className="text-xl font-black text-white">\</p>
        </div>
      </div>
\;
code = code.replace(oldHeaderRegex, newHeader);

// 2. Remove the BODY max-w-2xl wrapper constraint
const oldBodyRegex = /{\/\* BODY \*\/}\s*<div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">/;
code = code.replace(oldBodyRegex, '{/* BODY */}\n      <div className="space-y-4">');

// 3. Replace the fixed FOOTER with a sticky, contained block
const oldFooterRegex = /{\/\* FOOTER FIJO \(BOTTOM BAR\) \*\/}[\s\S]*?<div className="fixed bottom-0 left-0 w-full bg-neutral-950 border-t border-neutral-900 p-4 md:p-6 z-30 pb-safe shadow-\[0_-10px_40px_rgba\(0,0,0,0\.5\)\]">[\s\S]*?<div className="max-w-2xl mx-auto flex items-center justify-between">/g;

const newFooter = \
      {/* FOOTER CONTAINED */}
      <div className="sticky bottom-6 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 p-4 md:p-6 z-30 shadow-2xl rounded-2xl mx-2 md:mx-0 flex items-center justify-between">
\;
code = code.replace(oldFooterRegex, newFooter);

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', code, 'utf8');
