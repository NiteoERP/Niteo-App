const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  // Desktop
  let desktopSearch = "onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}\n                                  onFocus={() => setMostrarSugerencias(tx.id)}\n                                  onBlur={() => setTimeout(() => setMostrarSugerencias(null), 200)}";
  code = code.replace(desktopSearch, "onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}\n                                  list=\"bancos-list\"");

  // Mobile
  let mobileSearch = "onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}\n                                onFocus={() => setMostrarSugerencias('mob-' + tx.id)}\n                                onBlur={() => setTimeout(() => setMostrarSugerencias(null), 200)}";
  code = code.replace(mobileSearch, "onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}\n                                list=\"bancos-list\"");

  // Extra fallback if they have carriage returns
  desktopSearch = "onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}\r\n                                  onFocus={() => setMostrarSugerencias(tx.id)}\r\n                                  onBlur={() => setTimeout(() => setMostrarSugerencias(null), 200)}";
  code = code.replace(desktopSearch, "onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}\n                                  list=\"bancos-list\"");
  
  mobileSearch = "onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}\r\n                                onFocus={() => setMostrarSugerencias('mob-' + tx.id)}\r\n                                onBlur={() => setTimeout(() => setMostrarSugerencias(null), 200)}";
  code = code.replace(mobileSearch, "onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}\n                                list=\"bancos-list\"");

  fs.writeFileSync(file, code);
});
