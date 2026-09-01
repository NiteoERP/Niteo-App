const fs = require('fs');

let pageCode = fs.readFileSync('src/app/dashboard/caja/page.tsx', 'utf-8');

// Insert import
pageCode = pageCode.replace(
  /export const dynamic = 'force-dynamic';/,
  `export const dynamic = 'force-dynamic';\nimport { CierreEnCursoBanner } from '@/components/cierres/CierreEnCursoBanner';`
);

// Insert the banner above the HEADER div
pageCode = pageCode.replace(
  /\{\/\* HEADER \*\/\}/,
  `{/* BANNER */}\n      <CierreEnCursoBanner />\n\n      {/* HEADER */}`
);

fs.writeFileSync('src/app/dashboard/caja/page.tsx', pageCode);
