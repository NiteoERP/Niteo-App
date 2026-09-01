const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

code = code.replace(
  /export async function getBancosUtilizados\(\) \{/g,
  `export async function getBancosUtilizados(): Promise<Record<string, string[]>> {`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
