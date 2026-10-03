const fs = require('fs');
const content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

const regexes = [
  { search: /MǸtodo/g, replace: 'Método' },
  { search: /M.todo de Pago/g, replace: 'Método de Pago' }, // In case of weird chars
  { search: /N. Referencia/g, replace: 'Nº Referencia' },
  { search: /.\%\^ Bs\./g, replace: '≈ Bs.' },
  { search: /â‰ˆ Bs\./g, replace: '≈ Bs.' },
  { search: /MÃ©todo/g, replace: 'Método' },
  { search: /NÂº/g, replace: 'Nº' },
  { search: /Â¿/g, replace: '¿' },
  { search: /Ã¡/g, replace: 'á' },
  { search: /Ã©/g, replace: 'é' },
  { search: /Ã³/g, replace: 'ó' },
  { search: /Ãº/g, replace: 'ú' },
  { search: /Ã±/g, replace: 'ñ' },
  { search: /Ã­/g, replace: 'í' },
];

let newContent = content;
for (const r of regexes) {
  newContent = newContent.replace(r.search, r.replace);
}

// Write the fixed version
fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', newContent, 'utf8');
console.log('Fixed Mojibake');