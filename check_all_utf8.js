const fs = require('fs');

function checkFile(file) {
    const buffer = fs.readFileSync(file);
    const str = buffer.toString('utf8');
    const invalidCount = (str.match(/\uFFFD/g) || []).length;
    console.log(`${file}: ${invalidCount} invalid chars`);
}

checkFile('src/app/dashboard/inventario/InsumosManager.tsx');
checkFile('src/app/dashboard/inventario/page.tsx');
checkFile('src/app/dashboard/catalogo/page.tsx');
checkFile('src/actions/catalogo-actions.ts');