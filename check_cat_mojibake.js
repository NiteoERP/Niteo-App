const fs = require('fs');
const filepath = 'src/app/dashboard/catalogo/CatalogoClient.tsx';
const text = fs.readFileSync(filepath, 'utf8');
const lines = text.split('\n');
for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/MÃ©todo|NÂº|Â¿|Ã¡|Ã©|Ã³|Ãº|Ã±|Ã­|â‰ˆ|Ǹ/);
  if (match) {
    console.log(`Line ${i+1}: ${match[0]} -> ${lines[i].trim()}`);
  }
}