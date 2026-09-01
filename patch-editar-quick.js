const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

code = code.replace(
  /getCierrePrevio\(today, [^\)]+\)/g,
  'getCierreParaEditar(cierreId)'
);

code = code.replace(
  /setVentasTotales\(cierreRes\.ventasTotales \|\| 0\);/g,
  'setVentasTotales(cierreRes.cierre?.sistema_ventas_brutas || 0);'
);

code = code.replace(
  /setGastosTotales\(cierreRes\.gastosTotales \|\| 0\);/g,
  'setGastosTotales(cierreRes.cierre?.sistema_gastos_operativos || 0);'
);

code = code.replace(
  /setTotalEsperado\(cierreRes\.totalEsperado \|\| 0\);/g,
  'setTotalEsperado(cierreRes.cierre?.sistema_total_esperado || 0);'
);

code = code.replace(
  /setTasaCambio\(cierreRes\.tasaCambio \|\| 36\.5\);/g,
  `setTasaCambio(cierreRes.cierre?.tasa_cambio || 36.5);
        if (cierreRes.transacciones?.length > 0) {
           setTransacciones(cierreRes.transacciones);
        }
        if (cierreRes.cierre) setSelectedSedeId(cierreRes.cierre.sede_id);
  `
);

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
