const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

const regex = /useLiveTable\('compras_puntuales', \(\) => \{\r?\n\s*if \(activeTab === 'historial'\) \{\r?\n\s*cargarHistorialCompleto\(\);\r?\n\s*\} else if \(activeTab === 'puntual' \|\| activeTab === 'insumos'\) \{\r?\n\s*getUltimasCompras\(\)\.then\(res => \{\r?\n\s*if \(res\.success\) setUltimasCompras\(res\.compras \|\| \[\]\);\r?\n\s*\}\);\r?\n\s*\}\r?\n\s*\}\);\r?\n\s*\}\r?\n\s*\}\);/m;

const replacement = `useLiveTable('compras_puntuales', () => {
    if (activeTab === 'historial') {
      cargarHistorialCompleto();
    } else if (activeTab === 'puntual' || activeTab === 'insumos') {
      getUltimasCompras().then(res => {
        if (res.success) setUltimasCompras(res.compras || []);
      });
    }
  });`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
