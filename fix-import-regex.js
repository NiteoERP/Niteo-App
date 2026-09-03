const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');
code = code.replace(/import \{.*?\} from '@\/actions\/compras-actions';/, "import { editarFacturaInsumos, getComprasMetodosPago, addCompraMetodoPago } from '@/actions/compras-actions';");
fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
console.log("Fixed via regex");
