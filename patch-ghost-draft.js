const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');

  // Remove the old global DRAFT_KEY
  content = content.replace(/const DRAFT_KEY = 'niteo_draft_cierre';\r?\n/g, '');

  // Remove the old RESTAURAR BORRADOR useEffect
  const restoreStart = "// ─── FIX 1: RESTAURAR BORRADOR DESDE localStorage AL MONTAR";
  while (content.includes(restoreStart)) {
    const idx = content.indexOf(restoreStart);
    // Find the end of the useEffect
    const endIdx = content.indexOf('}, []);', idx);
    if (endIdx !== -1) {
      content = content.slice(0, idx) + content.slice(endIdx + '}, []);\n'.length);
    } else {
      break;
    }
  }

  // Same for alternative comment style that might be there
  const restoreStart2 = "// ??? FIX 1: RESTAURAR BORRADOR DESDE localStorage AL MONTAR";
  while (content.includes(restoreStart2)) {
    const idx = content.indexOf(restoreStart2);
    // Find the end of the useEffect
    const endIdx = content.indexOf('}, []);', idx);
    if (endIdx !== -1) {
      content = content.slice(0, idx) + content.slice(endIdx + '}, []);\n'.length);
    } else {
      break;
    }
  }
  
  // Actually the comment might have mojibake because of encoding
  // So I'll use regex to match the useEffect
  content = content.replace(
    /\/\/ [^\n]*FIX 1: RESTAURAR BORRADOR DESDE localStorage AL MONTAR[^\n]*\n\s*useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);\n/g,
    ''
  );

  // In limpiarBorrador, add a line to delete the ghost draft
  content = content.replace(
    /const limpiarBorrador = \(\) => \{/g,
    `const limpiarBorrador = () => {
    try { localStorage.removeItem('niteo_draft_cierre'); } catch (_) {}`
  );

  fs.writeFileSync(file, content);
});
