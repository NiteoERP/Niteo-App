const fs = require('fs');
const glob = require('fs').readdirSync('src', { recursive: true }).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

const replacements = [
  { search: /MǸtodo/g, replace: 'Método' },
  { search: /â‰ˆ/g, replace: '≈' },
  { search: /MÃ©todo/g, replace: 'Método' },
  { search: /NÂº/g, replace: 'Nº' },
  { search: /Â¿/g, replace: '¿' },
  { search: /Ã¡/g, replace: 'á' },
  { search: /Ã©/g, replace: 'é' },
  { search: /Ã³/g, replace: 'ó' },
  { search: /Ãº/g, replace: 'ú' },
  { search: /Ã±/g, replace: 'ñ' },
  { search: /Ã­/g, replace: 'í' },
  { search: /â€/g, replace: '─' },
  { search: /â”€/g, replace: '─' },
  { search: /Ã¼/g, replace: 'ü' },
  { search: /Ã‘/g, replace: 'Ñ' },
  { search: /Ã/g, replace: 'í' }, // risky but ok if run last
];

for (const file of glob) {
  const filepath = 'src/' + file;
  if (!fs.lstatSync(filepath).isFile()) continue;
  let text = fs.readFileSync(filepath, 'utf8');
  let original = text;
  
  for (const r of replacements) {
    text = text.replace(r.search, r.replace);
  }
  
  if (text !== original) {
    fs.writeFileSync(filepath, text, 'utf8');
    console.log(`Fixed ${filepath}`);
  }
}