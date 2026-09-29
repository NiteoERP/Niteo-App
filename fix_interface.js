const fs = require('fs');

let content = fs.readFileSync('src/actions/pos-actions.ts', 'utf-8');

content = content.replace(
    "cliente_nombre?: string;",
    "cliente_nombre?: string;\n  cajero_nombre?: string;\n  mesero_nombre?: string;"
);

fs.writeFileSync('src/actions/pos-actions.ts', content, 'utf-8');
