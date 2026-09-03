const fs = require('fs');

// 1. Fix MobileCompraForm.tsx (\n\n bug and validation)
let formCode = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');
formCode = formCode.replace(`</div>\\n\\n          <hr className="border-neutral-800" />`, `</div>\n          <hr className="border-neutral-800" />`);

// If it's written as literal string "\n\n", wait, my previous regex search didn't find `\\n`.
// Let's replace the EXACT text block in MobileCompraForm.tsx
// I will just use regex to replace `>\\n\\n          <hr` with `>\n          <hr`
// Actually, `</div>\n\n          <hr className="border-neutral-800" />`
formCode = formCode.replace(/<\/div>\s*\\n\\n\s*<hr className="border-neutral-800" \/>/g, '</div>\n          <hr className="border-neutral-800" />');

// Let's do a broader replacement for `\n\n`
formCode = formCode.replace(/\\n\\n/g, '');

// Also fix the disabled button
formCode = formCode.replace(
  `disabled={!cantidad || !costoTotal || (!selectedInsumo && !isNewInsumo)}`,
  ``
);

const handleAddToCartRegex = /const handleAddToCart = \(\) => {/g;
formCode = formCode.replace(
  handleAddToCartRegex,
  `const handleAddToCart = () => {
    if (!cantidad || !costoTotal || (!selectedInsumo && !isNewInsumo)) {
      setErrorMsg('Por favor completa la cantidad, el costo total y selecciona un insumo.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }`
);

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', formCode);

// 2. Fix actions.ts (remove broken join)
let actionsCode = fs.readFileSync('src/app/dashboard/compras/actions.ts', 'utf-8');
actionsCode = actionsCode.replace(
  `select('id, fecha_registro, proveedor, detalles, monto_divisas, tasa_cambio, monto_bs, metodo_pago, usuario_id, perfiles:usuario_id(nombre_completo)')`,
  `select('id, fecha_registro, proveedor, detalles, monto_divisas, tasa_cambio, monto_bs, metodo_pago, usuario_id')`
);
fs.writeFileSync('src/app/dashboard/compras/actions.ts', actionsCode);

console.log("Fixes applied successfully!");
