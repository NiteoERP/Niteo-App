const fs = require('fs');
const path = require('path');

const newProds = JSON.parse(fs.readFileSync(path.join(__dirname, 'recently_inserted_prods.json'), 'utf8'));
const originalProds = JSON.parse(fs.readFileSync(path.join(__dirname, 'db_existing_prods.json'), 'utf8'));

function findCandidates(name, newPrice) {
  const words = name.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const candidates = [];
  for (const op of originalProds) {
    const opLower = op.nombre.toLowerCase();
    let matchCount = 0;
    for (const w of words) {
      if (opLower.includes(w)) matchCount++;
    }
    if (matchCount > 0) {
      candidates.push({
        orig: op,
        matchCount,
        priceDiff: Math.abs((op.precio_venta || 0) - newPrice)
      });
    }
  }
  candidates.sort((a, b) => b.matchCount - a.matchCount || a.priceDiff - b.priceDiff);
  return candidates.slice(0, 5);
}

console.log('=== CANDIDATE ORIGINAL PRODUCTS FOR EACH OF THE 41 NEW PRODS ===\n');
for (const np of newProds) {
  const cands = findCandidates(np.nombre, np.precio_venta);
  console.log(`\nNUEVO: [${np.nombre}] ($${np.precio_venta}) - ID: ${np.id}`);
  cands.forEach(c => {
    console.log(`   -> CANDIDATO: [${c.orig.nombre}] ($${c.orig.precio_venta}) - ID: ${c.orig.id}`);
  });
}
