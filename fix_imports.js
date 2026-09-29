const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const lucideRegex = /import\s+\{([^}]+)\}\s+from\s+'lucide-react'/g;
let match;
let allImports = new Set();
while ((match = lucideRegex.exec(code)) !== null) {
  match[1].split(',').forEach(item => {
    let clean = item.trim();
    if (clean) allImports.add(clean);
  });
}

code = code.replace(/import\s+\{[^}]+\}\s+from\s+'lucide-react';?/g, '');

const newImport = "import { " + Array.from(allImports).join(', ') + " } from 'lucide-react';\n";
code = newImport + code;

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
