const fs = require('fs');

const fixFile = (filePath, search, replace) => {
  let code = fs.readFileSync(filePath, 'utf-8');
  code = code.replace(search, replace);
  fs.writeFileSync(filePath, code);
  console.log(`Fixed ${filePath}`);
};

// Fix pos-actions.ts
fixFile(
  'src/actions/pos-actions.ts',
  "\\Venta POS - Doc: \\\\,",
  "`Venta POS - Doc: ${factura.numero_documento}`,"
);

// Fix creditos-actions.ts
let credCode = fs.readFileSync('src/actions/creditos-actions.ts', 'utf-8');
// It had duplicate import: import { registrarAsiento } from './contabilidad-actions';
const imports = credCode.match(/import \{ registrarAsiento \} from '\.\/contabilidad-actions';/g);
if (imports && imports.length > 1) {
  credCode = credCode.replace("import { registrarAsiento } from './contabilidad-actions';\r\n", "");
  fs.writeFileSync('src/actions/creditos-actions.ts', credCode);
  console.log("Fixed creditos-actions.ts duplicate import");
}
