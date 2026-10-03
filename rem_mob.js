const fs = require('fs');

function removeLines(file, startLine, endLine) {
    let lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.splice(startLine - 1, endLine - startLine + 1);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

removeLines('src/components/compras/MobileCompraForm.tsx', 50, 85);
console.log('Removed duplicate from mobile');