const fs = require('fs');
const file = 'src/app/dashboard/caja/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('diferencia_total, observaciones, editado_por', 'diferencia_total, editado_por');
content = content.replace(/\{cierre\.observaciones && \([\s\S]*?\}\)/, '');

fs.writeFileSync(file, content);
console.log('Fixed query');
