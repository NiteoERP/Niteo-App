const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf-8');

code = code.replace(
  /const handleSedeChange = async \(newSedeId: string\) => \{/,
  `const handleSedeChange = async (newSedeId: string) => {
    // Al cambiar de sede, debemos limpiar la información que estaba llenando para no mezclar datos
    setTransacciones([]);
    setHasDraft(false);
    try { localStorage.removeItem('niteo_draft_cierre'); } catch(e){}`
);

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', code);
