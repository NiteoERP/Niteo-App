const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

// There are TWO export async function getBancosUtilizados()
// I will keep the one that returns Record<string, string[]> and delete the other one

const toDeleteStart = code.lastIndexOf('export async function getBancosUtilizados(): Promise<Record<string, string[]>> {');
// Wait, both have the SAME signature now because I ran patch-actions-type.js!
const oldVersionStr = "if (bancos.length === 0) return ['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'BNC'];";

if (code.includes(oldVersionStr)) {
  // Let's find the start of the BAD block
  const badBlockEnd = code.indexOf(oldVersionStr) + oldVersionStr.length + '\n  return bancos;\n}'.length + 2;
  // find the start of this export
  const badBlockStart = code.lastIndexOf('export async function getBancosUtilizados', code.indexOf(oldVersionStr));
  
  if (badBlockStart !== -1) {
    code = code.slice(0, badBlockStart) + code.slice(badBlockEnd);
  }
}

fs.writeFileSync('src/actions/cierres-actions.ts', code);
