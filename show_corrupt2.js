const fs = require('fs');
const lines = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8').split('\n');
const corruptLines = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('Ã') || l.includes('Â') || l.includes('â') || l.includes('ð') || l.includes('Ǹ') || l.includes('')) {
    corruptLines.push((i+1) + ": " + l.trim());
  }
}
console.log(corruptLines.slice(0, 30).join('\n'));
if (corruptLines.length > 30) console.log("... " + (corruptLines.length - 30) + " more");