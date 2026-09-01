const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');

  // Fix the save effect DRAFT_KEY
  content = content.replace(
    /localStorage\.setItem\(DRAFT_KEY, JSON\.stringify\(\{ transacciones, metodos_custom \}\)\);/g,
    `if (selectedSedeId) {
        localStorage.setItem(\`niteo_draft_cierre_\${selectedSedeId}\`, JSON.stringify({ transacciones, metodos_custom }));
      }`
  );

  // Fix isClient
  content = content.replace(
    /const lastSedeId = isClient \? /g,
    `const lastSedeId = typeof window !== 'undefined' ? `
  );

  fs.writeFileSync(file, content);
});
