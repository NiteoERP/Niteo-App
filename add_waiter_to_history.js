const fs = require('fs');

// 1. Update pos-actions.ts
let actionsPath = 'src/actions/pos-actions.ts';
let actionsContent = fs.readFileSync(actionsPath, 'utf-8');

const oldInterface = `    esta_pagado: boolean;
    cliente_nombre?: string;
    pagos?: { tipo_pago: string, monto: number }[];`;
    
const newInterface = `    esta_pagado: boolean;
    cliente_nombre?: string;
    cajero_nombre?: string;
    mesero_nombre?: string;
    pagos?: { tipo_pago: string, monto: number }[];`;

if (!actionsContent.includes('cajero_nombre?: string')) {
    actionsContent = actionsContent.replace(oldInterface, newInterface);
    fs.writeFileSync(actionsPath, actionsContent, 'utf-8');
    console.log("Updated pos-actions.ts");
}

// 2. Update HistorialVentas.tsx
let componentPath = 'src/components/pos/HistorialVentas.tsx';
let componentContent = fs.readFileSync(componentPath, 'utf-8');

// Also import Contact or BadgeCheck for Cashier/Waiter icons
if (!componentContent.includes('Contact')) {
    componentContent = componentContent.replace(
        "Users, CheckCircle2, Circle, Hash, ChevronLeft, ChevronRight, Printer, Ban, Sparkles, Filter, X } from 'lucide-react'",
        "Users, CheckCircle2, Circle, Hash, ChevronLeft, ChevronRight, Printer, Ban, Sparkles, Filter, X, Contact, ConciergeBell } from 'lucide-react'"
    );
}

const oldGrid = `<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-w-[300px]">
                      <div className="flex flex-col items-start justify-center">
                        <p className="text-xs text-neutral-500 mb-1 w-full text-left">Cliente</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <Users size={14} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{venta.cliente_nombre && venta.cliente_nombre !== 'Unknown' ? venta.cliente_nombre : 'Consumidor Final'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-center">
                        <p className="text-xs text-neutral-500 mb-1 w-full text-left">Núm. Orden / Mesa</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <Hash size={14} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{venta.numero_orden || '-'}</span>
                        </div>
                      </div>
                    </div>`;
                    
// Note: Some characters might be enconded in the file due to earlier cats, e.g., "NÃºm." instead of "Núm."
// So I will use regex.

const gridPattern = /<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-w-\[300px\]">[\s\S]*?<Hash size=\{14\} className="text-neutral-500 shrink-0" \/>\s*<span className="truncate">\{venta\.numero_orden \|\| '-'\}.*?<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/m;

const newGrid = `<div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-[300px]">
                      <div className="flex flex-col items-start justify-center">
                        <p className="text-xs text-neutral-500 mb-1 w-full text-left">Cliente</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <Users size={14} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{venta.cliente_nombre && venta.cliente_nombre !== 'Unknown' ? venta.cliente_nombre : 'Consumidor Final'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-center">
                        <p className="text-xs text-neutral-500 mb-1 w-full text-left">Orden / Mesa</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <Hash size={14} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{venta.numero_orden || '-'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-center">
                        <p className="text-xs text-neutral-500 mb-1 w-full text-left">Cajero</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <Contact size={14} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{venta.cajero_nombre || 'Principal'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-center">
                        <p className="text-xs text-neutral-500 mb-1 w-full text-left">Mesero</p>
                        <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                          <ConciergeBell size={14} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{venta.mesero_nombre || 'N/A'}</span>
                        </div>
                      </div>
                    </div>`;

if (gridPattern.test(componentContent)) {
    componentContent = componentContent.replace(gridPattern, newGrid);
    fs.writeFileSync(componentPath, componentContent, 'utf-8');
    console.log("Updated HistorialVentas.tsx");
} else {
    console.log("Could not find grid pattern in HistorialVentas.tsx");
}
