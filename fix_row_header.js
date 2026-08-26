const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

const regex = /<div className="flex items-center gap-4 min-w-\[200px\]">\s*<div className="bg-neutral-800 p-2 rounded-lg">\s*<Receipt size=\{20\} className="text-indigo-400" \/>\s*<\/div>/;

const replacement = `<div className="flex items-center gap-4 min-w-[200px]">
                    <button 
                      onClick={(e) => handleToggleVerificado(e, venta.id, !!venta.verificado)}
                      className={\`p-1 rounded-full transition-colors \${venta.verificado ? 'text-emerald-400 hover:text-emerald-300' : 'text-neutral-600 hover:text-neutral-400'}\`}
                      title={venta.verificado ? "Desmarcar" : "Marcar como verificado"}
                    >
                      {venta.verificado ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <div className="bg-neutral-800 p-2 rounded-lg">
                      <Receipt size={20} className="text-indigo-400" />
                    </div>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
