const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

// 1. Increase padding in Master table rows
code = code.replace(/className="px-3 py-1\.5 font-mono text-\[10px\]"/g, 'className="px-4 py-2.5 font-mono text-[11px] text-neutral-400"');
code = code.replace(/className="px-3 py-1\.5"/g, 'className="px-4 py-2.5 text-neutral-200"');
code = code.replace(/className="px-3 py-1\.5 truncate/g, 'className="px-4 py-2.5 truncate text-neutral-200');
code = code.replace(/className="px-3 py-1\.5 text-right/g, 'className="px-4 py-2.5 text-right font-medium text-white"');
// Fix the "Total Bs" and "Total USD" so they are matched correctly
code = code.replace(/className="px-4 py-2\.5 text-right font-medium text-white font-mono"/g, 'className="px-4 py-2.5 text-right font-mono font-medium text-white"');

// 2. Improve headers
code = code.replace(/<thead className="sticky top-0 bg-neutral-900 text-neutral-400 z-10">/g, '<thead className="sticky top-0 bg-neutral-950/80 backdrop-blur-md text-neutral-400 z-10 text-[11px] uppercase tracking-wider">');
code = code.replace(/<th className="px-3 py-2 font-semibold border-b/g, '<th className="px-4 py-3 font-bold border-b');

// 3. Improve input filters
code = code.replace(/className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-0\.5/g, 'className="w-full bg-neutral-900/50 border border-neutral-800 rounded-md px-3 py-1.5');

// 4. Increase padding in Details table
code = code.replace(/<td colSpan=\{8\}/g, '<td colSpan={8}');
code = code.replace(/<td colSpan=\{5\}/g, '<td colSpan={5}');

// 5. Change "bg-[#111111]" to something more Niteo
code = code.replace(/className="flex-1 flex flex-col bg-\[#111111\] overflow-hidden"/g, 'className="flex-1 flex flex-col bg-[#050505] overflow-hidden"');
code = code.replace(/bg-neutral-950 border-b border-neutral-800/g, 'bg-[#0A0A0A] border-b border-neutral-800/50');
code = code.replace(/border-neutral-800/g, 'border-neutral-800/50');

// 6. Fix selected row color to be a bit more subtle (indigo instead of sky)
code = code.replace(/bg-sky-600\/30 text-white/g, 'bg-indigo-500/20 text-white border-l-2 border-indigo-500');

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Refined the aesthetics");
