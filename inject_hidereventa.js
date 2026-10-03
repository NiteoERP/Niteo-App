const fs = require('fs');
let file = 'src/app/dashboard/inventario/InsumosManager.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');
lines.splice(322, 0, '  const [hideReventa, setHideReventa] = useState(false);');
fs.writeFileSync(file, lines.join('\n'), 'utf8');