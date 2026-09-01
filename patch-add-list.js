const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  // Replace Desktop Input
  code = code.replace(
    /onChange=\{\(e\) => updateTransaccion\(tx\.id, 'banco', e\.target\.value\)\}\n\s*onFocus=\{\(\) => setMostrarSugerencias\(tx\.id\)\}\n\s*onBlur=\{\(\) => setTimeout\(\(\) => setMostrarSugerencias\(null\), 200\)\}/g,
    `onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}
                                  list="bancos-list"`
  );

  // Replace Mobile Input
  code = code.replace(
    /onChange=\{\(e\) => updateTransaccion\(tx\.id, 'banco', e\.target\.value\)\}\n\s*onFocus=\{\(\) => setMostrarSugerencias\('mob-' \+ tx\.id\)\}\n\s*onBlur=\{\(\) => setTimeout\(\(\) => setMostrarSugerencias\(null\), 200\)\}/g,
    `onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}
                                list="bancos-list"`
  );

  fs.writeFileSync(file, code);
});
