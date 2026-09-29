const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-web/src/hooks/useInformesData.ts', 'utf8');

const s1 = code.lastIndexOf("if (reportId === 'ventas_usuarios') {");
const endBlock = code.indexOf("if (reportId === 'ventas_clientes') {", s1);

const newBlock = `if (reportId === 'ventas_usuarios') {
    let sumFacCaj = 0;
    let sumVenCaj = 0;
    let sumFacVen = 0;
    let sumVenVen = 0;
    for (const r of rawData) {
      sumFacCaj += Number(r.facturas_cajero || 0);
      sumVenCaj += Number(r.ventas_cajero || 0);
      sumFacVen += Number(r.facturas_vendedor || 0);
      sumVenVen += Number(r.ventas_vendedor || 0);
    }
    return [
      ...rawData,
      {
        nombre_empleado: 'TOTALES',
        facturas_cajero: sumFacCaj,
        ventas_cajero: sumVenCaj,
        facturas_vendedor: sumFacVen,
        ventas_vendedor: sumVenVen,
      },
    ];
  }

  `;

code = code.substring(0, s1) + newBlock + code.substring(endBlock);
fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-web/src/hooks/useInformesData.ts', code);
console.log("Patched useInformesData.ts");
