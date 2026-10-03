const fs = require('fs');

function fixCompression(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/const MAX_WIDTH = 1200;/g, 'const MAX_WIDTH = 2000;');
    content = content.replace(/const MAX_HEIGHT = 1200;/g, 'const MAX_HEIGHT = 2000;');
    content = content.replace(/'image\/jpeg', 0\.7/g, "'image/jpeg', 0.85");
    fs.writeFileSync(filePath, content, 'utf8');
}

fixCompression('src/app/dashboard/proveedores/page.tsx');
fixCompression('src/components/compras/MobileCompraForm.tsx');
console.log('Fixed compression quality');