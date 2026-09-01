const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

code = code.replace(
  /const handleSedeChange = async \(newSedeId: string\) => \{[\s\S]*?setLoading\(false\);\r?\n  \};/m,
  "const handleSedeChange = async (newSedeId: string) => { /* NO-OP in Edit */ };"
);

code = code.replace(
  /<select[\s\n]*value=\{selectedSedeId\}[\s\n]*onChange=\{\(e\) => handleSedeChange\(e\.target\.value\)\}/m,
  '<select\n                  value={selectedSedeId}\n                  disabled\n                  onChange={(e) => handleSedeChange(e.target.value)}'
);

// We should also replace the getCierrePrevio import with getCierreParaEditar
code = code.replace(
  /getCierrePrevio, actualizarCierre, getBancosUtilizados, getMetodosHistorialSede/g,
  'getCierreParaEditar, actualizarCierre, getBancosUtilizados, getMetodosHistorialSede'
);

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
