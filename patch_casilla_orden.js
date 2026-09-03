const fs = require('fs');
let code = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf8');

// 1. Add Hash to lucide-react imports
code = code.replace(
  "import { Search, Calendar, ChevronDown, ChevronUp, Receipt, DollarSign, Clock, Users, CheckCircle2, Circle } from 'lucide-react';",
  "import { Search, Calendar, ChevronDown, ChevronUp, Receipt, DollarSign, Clock, Users, CheckCircle2, Circle, Hash } from 'lucide-react';"
);

// 2. Replace the Cliente / Mesa block
const oldBlock = `<div className="flex-1 min-w-[150px]">
                    <p className="text-xs text-neutral-500 mb-1">Cliente / Mesa</p>
                    <div className="flex items-center gap-1.5 text-neutral-300 text-sm font-medium">
                      <Users size={14} className="text-neutral-500" />
                      {venta.numero_orden ? venta.numero_orden : (venta.cliente_nombre && venta.cliente_nombre !== 'Unknown' ? venta.cliente_nombre : 'Consumidor Final')}
                    </div>
                    {/* NOTA: Aqu se mostrara la Mesa si existe un campo especfico en el futuro */}
                  </div>`;

const newBlock = `<div className="flex-1 min-w-[150px]">
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

// 3. Since the regex match with exact formatting might fail, let's use a robust replace
code = code.replace(/<div className="flex-1 min-w-\[150px\]">[\s\S]*?{\/\* NOTA.*?\*\/}\s*<\/div>/, newBlock);

fs.writeFileSync('src/components/pos/HistorialVentas.tsx', code, 'utf8');
