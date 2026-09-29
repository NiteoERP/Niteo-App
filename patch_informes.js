const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-web/src/hooks/useInformesData.ts', 'utf8');

// Replace nombre_cajero with nombre_empleado in ventas_usuarios
code = code.replace(
  `nombre_cajero: 'TOTALES',`,
  `nombre_empleado: 'TOTALES',`
);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-web/src/hooks/useInformesData.ts', code);
console.log("Patched useInformesData.ts for nombre_empleado");
