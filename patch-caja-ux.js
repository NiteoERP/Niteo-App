const fs = require('fs');

// Patch caja/page.tsx
let pageCode = fs.readFileSync('src/app/dashboard/caja/page.tsx', 'utf-8');
pageCode = pageCode.replace(
  /export const dynamic = 'force-dynamic';/,
  `export const dynamic = 'force-dynamic';\nimport { CierreEnCursoBanner } from '@/components/cierres/CierreEnCursoBanner';`
);
pageCode = pageCode.replace(
  /{[^]*?HEADER[^]*?}/,
  `{/* HEADER */}\n      <CierreEnCursoBanner />\n      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">`
);
fs.writeFileSync('src/app/dashboard/caja/page.tsx', pageCode);

// Patch caja/nuevo/page.tsx
let nuevoCode = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf-8');
// Add arrow left back button next to "Cierre de Caja" title
nuevoCode = nuevoCode.replace(
  /<h1 className="text-2xl font-bold text-white tracking-tight">Cierre de Caja<\/h1>/,
  `<div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard/caja')} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors" title="Volver al Historial (Se guardará el borrador)">
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-2xl font-bold text-white tracking-tight">Cierre de Caja</h1>
            </div>`
);
if (!nuevoCode.includes('ArrowLeft')) {
  nuevoCode = nuevoCode.replace(
    /import \{ Plus, Trash2, Wallet/,
    `import { ArrowLeft, Plus, Trash2, Wallet`
  );
}

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', nuevoCode);
