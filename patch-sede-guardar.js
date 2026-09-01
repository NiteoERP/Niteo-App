const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  code = code.replace(
    /const guardar = async \(\) => \{/g,
    `const guardar = async () => {
    if (selectedSedeId) localStorage.setItem('niteo_last_sede', selectedSedeId);`
  );

  fs.writeFileSync(file, code);
});
