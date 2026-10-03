const fs = require('fs');
const glob = require('fs').readdirSync('src', { recursive: true }).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

let found = false;
for (const file of glob) {
  const filepath = 'src/' + file;
  if (!fs.lstatSync(filepath).isFile()) continue;
  const text = fs.readFileSync(filepath, 'utf8');
  if (text.match(/MÃ©todo|NÂº|Â¿|Ã¡|Ã©|Ã³|Ãº|Ã±|Ã­|â‰ˆ|Ǹ/)) {
    console.log(`Corrupt file: ${filepath}`);
    found = true;
  }
}
if (!found) console.log('No corrupted strings found.');