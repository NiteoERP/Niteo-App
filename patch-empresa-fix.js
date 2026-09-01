const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

// I need to change back .eq('cierres_caja.empresa_id', profile.empresa_id)
// to .eq('empresa_id', profile.empresa_id)
// EXCEPT in getBancosUtilizados!

code = code.replace(
  /\.eq\('cierres_caja\.empresa_id', profile\.empresa_id\)/g,
  ".eq('empresa_id', profile.empresa_id)"
);

// Now carefully fix getBancosUtilizados ONLY
const getBancos = `export async function getBancosUtilizados(): Promise<Record<string, string[]>> {`;
if (code.includes(getBancos)) {
  let idx = code.indexOf(getBancos);
  let limitIdx = code.indexOf(".limit(500);", idx);
  
  if (limitIdx !== -1) {
    let block = code.slice(idx, limitIdx);
    block = block.replace(
      /\.eq\('empresa_id', profile\.empresa_id\)/g,
      ".eq('cierres_caja.empresa_id', profile.empresa_id)"
    );
    code = code.slice(0, idx) + block + code.slice(limitIdx);
  }
}

fs.writeFileSync('src/actions/cierres-actions.ts', code);
