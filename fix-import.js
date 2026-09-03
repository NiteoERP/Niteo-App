const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

// Add import
if (!code.includes('getComprasMetodosPago')) {
  code = code.replace(
    "import { editarFacturaInsumos } from '@/actions/compras-actions';",
    "import { editarFacturaInsumos, getComprasMetodosPago, addCompraMetodoPago } from '@/actions/compras-actions';"
  );
}

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
console.log("ComprasClient import fixed");
