const fs = require('fs');

let mobileCode = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');
mobileCode = mobileCode.replace('<option value="USD">Dólar ($ USD)</option>', '<option value="USD">USD</option>');
mobileCode = mobileCode.replace('<option value="VES">Bolívar (Bs VES)</option>', '<option value="VES">VES</option>');
fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', mobileCode);

let desktopCode = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');
desktopCode = desktopCode.replace('<option value="VES">Bs</option>', '<option value="VES">VES</option>');
fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', desktopCode);

console.log("Patched");
