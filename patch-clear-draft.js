const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf-8');

code = code.replace(
  /if \(selectedSedeId\) localStorage\.removeItem\(`niteo_draft_cierre_\$\{selectedSedeId\}`\);\n\s*setHasDraft\(false\);\n\s*alert\('Cierre guardado correctamente!'\);\n\s*router\.push\('\/dashboard\/caja'\);/,
  `if (selectedSedeId) localStorage.removeItem(\`niteo_draft_cierre_\${selectedSedeId}\`);
          setTransacciones([]);
          setHasDraft(false);
          alert('Cierre guardado correctamente!');
          router.push('/dashboard/caja');
          router.refresh();`
);

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', code);
