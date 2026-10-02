const fs = require('fs');
const files = [
  'src/app/dashboard/proveedores/page.tsx',
  'src/components/compras/MobileCompraForm.tsx'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/Ã—/g, 'x');
  content = content.replace(/\uFFFD-/g, 'x ');
  content = content.replace(/\uFFFD/g, 'x');
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed properly');