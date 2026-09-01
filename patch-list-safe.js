const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');

  // Replace desktop onFocus/onBlur
  content = content.replace(
    /onFocus=\{\(\) => setMostrarSugerencias\(tx\.id\)\}\r?\n\s*onBlur=\{\(\) => setTimeout\(\(\) => setMostrarSugerencias\(null\), 200\)\}/g,
    'list="bancos-list"'
  );

  // Replace mobile onFocus/onBlur
  content = content.replace(
    /onFocus=\{\(\) => setMostrarSugerencias\('mob-' \+ tx\.id\)\}\r?\n\s*onBlur=\{\(\) => setTimeout\(\(\) => setMostrarSugerencias\(null\), 200\)\}/g,
    'list="bancos-list"'
  );

  fs.writeFileSync(file, content);
});
