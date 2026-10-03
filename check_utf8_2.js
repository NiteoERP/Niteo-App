const fs = require('fs');
const file1 = 'src/app/dashboard/proveedores/page.tsx';
const file2 = 'src/components/compras/MobileCompraForm.tsx';

function check(file) {
  const buf = fs.readFileSync(file);
  const str = buf.toString('utf8');
  console.log(`${file}: ${(str.match(/\uFFFD/g) || []).length} invalid chars`);
}
check(file1);
check(file2);