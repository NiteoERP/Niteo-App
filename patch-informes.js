const fs = require('fs');

let pageCode = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// 1. Rename report ID
pageCode = pageCode.replace(
  `{ id: 'ventas_productos',  name: 'Top Productos',`, 
  `{ id: 'productos_vendidos',  name: 'Top Productos', extraFilters: ['categoria', 'cajero', 'cliente'],`
);

// 2. Fix error handling
pageCode = pageCode.replace(
  /} else {\s*setReportError\(res\.error \|\| 'Error desconocido\.'\);\s*}/,
  `} else {
          setReportError(res.error || 'Error desconocido.');
          setReportData(null);
        }`
);

fs.writeFileSync('src/app/dashboard/informes/page.tsx', pageCode);
