const fs = require('fs');
const files = [
  'src/app/dashboard/proveedores/page.tsx',
  'src/components/compras/MobileCompraForm.tsx'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replaceAll('', 'x');
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed more');