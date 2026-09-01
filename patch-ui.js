const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/page.tsx', 'utf-8');

code = code.replace(
  /<h4 className="text-lg font-bold text-white">Cierre \{new Date\(c\.fecha_cierre \+ 'T12:00:00Z'\)\.toLocaleDateString\('es-VE'\)\}<\/h4>/,
  `<h4 className="text-lg font-bold text-white">Cierre {new Date(c.fecha_cierre + 'T12:00:00Z').toLocaleDateString('es-VE')} - {c.sedes?.nombre_sede || 'Sede'}</h4>`
);

fs.writeFileSync('src/app/dashboard/caja/page.tsx', code);
