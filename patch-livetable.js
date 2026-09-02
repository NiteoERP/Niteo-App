const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

const oldLiveTable = `  useLiveTable('compras_puntuales', () => {
    if (activeTab === 'historial') {
      cargarHistorialCompleto();
    }
  });

  useLiveTable('compras_mercancia', () => {
    if (activeTab === 'puntual') {
      getUltimasCompras().then(res => {
        if (res.success) setUltimasCompras(res.compras || []);
      });
    }
  });`;

const newLiveTable = `  useLiveTable('compras_puntuales', () => {
    if (activeTab === 'historial') {
      cargarHistorialCompleto();
    } else if (activeTab === 'puntual' || activeTab === 'insumos') {
      getUltimasCompras().then(res => {
        if (res.success) setUltimasCompras(res.compras || []);
      });
    }
  });`;

// Because of spacing/newlines we can use a simpler replacement
code = code.replace(/useLiveTable\('compras_puntuales'[\s\S]*?useLiveTable\('compras_mercancia'[\s\S]*?\}\);/m, newLiveTable);

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
