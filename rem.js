const fs = require('fs');

function removeLines(file, startLine, endLine) {
    let lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.splice(startLine - 1, endLine - startLine + 1);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

removeLines('src/app/dashboard/proveedores/page.tsx', 120, 155);
console.log('Removed duplicate from proveedores');