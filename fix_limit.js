const fs = require('fs');

let c = fs.readFileSync('src/actions/mesas-actions.ts', 'utf8');

c = c.replace(
    ".order('nombre');",
    ".order('nombre').limit(3000);"
);

fs.writeFileSync('src/actions/mesas-actions.ts', c, 'utf8');
console.log('Success limit replace');
