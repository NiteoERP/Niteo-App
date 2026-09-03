const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

const oldBlock = `<div className="flex-1 min-w-[150px]">
                    <p className="text-xs text-neutral-500 mb-1">Cliente</p>
                    <div className="flex items-center gap-1.5 text-neutral-300 text-sm font-medium">
                      <Users size={14} className="text-neutral-500" />
                      {venta.cliente_nombre && venta.cliente_nombre !== 'Unknown' ? venta.cliente_nombre : 'Consumidor Final'}
                    </div>
                  </div>

                  <div className="flex-1 min-w-[120px]">
                    <p className="text-xs text-neutral-500 mb-1">Núm. Orden / Mesa</p>
                    <div className="flex items-center gap-1.5 text-neutral-300 text-sm font-medium">
                      <Hash size={14} className="text-neutral-500" />
                      {venta.numero_orden || '-'}
                    </div>
                  </div>`;

const newBlock = `<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-w-[300px]">
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Cliente</p>
                      <div className="flex items-center gap-1.5 text-neutral-300 text-sm font-medium">
                        <Users size={14} className="text-neutral-500" />
                        {venta.cliente_nombre && venta.cliente_nombre !== 'Unknown' ? venta.cliente_nombre : 'Consumidor Final'}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Núm. Orden / Mesa</p>
                      <div className="flex items-center gap-1.5 text-neutral-300 text-sm font-medium">
                        <Hash size={14} className="text-neutral-500" />
                        {venta.numero_orden || '-'}
                      </div>
                    </div>
                  </div>`;

// We use robust replacement for space differences
code = code.replace(/<div className="flex-1 min-w-\[150px\]">[\s\S]*?venta\.numero_orden \|\| '-'}\s*<\/div>\s*<\/div>/, newBlock);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
