const fs = require('fs');
// Check if the file contains the raw string 'años' encoded as proper UTF-8
const content = fs.readFileSync('src/app/dashboard/inventario/InsumosManager.tsx', 'utf8');

const checks = [
  { label: 'años (type)', found: content.includes("'años'") },
  { label: 'hideReventa state', found: content.includes('[hideReventa, setHideReventa] = useState(false)') },
  { label: 'filterCategoria logic', found: content.includes('filterCategoria !== \'TODOS\'') },
  { label: 'hideReventa filter', found: content.includes('if (hideReventa)') },
];

for (const c of checks) {
  console.log(c.found ? `✅ ${c.label}` : `❌ MISSING: ${c.label}`);
}