const fs = require('fs');
const path = require('path');

const newProds = JSON.parse(fs.readFileSync(path.join(__dirname, 'recently_inserted_prods.json'), 'utf8'));
const originalProds = JSON.parse(fs.readFileSync(path.join(__dirname, 'db_existing_prods.json'), 'utf8'));

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

console.log('=== MATCHING 41 NEW PRODUCTS TO EXISTING ORIGINAL PRODUCTS ===\n');

const mappings = [];

for (const np of newProds) {
  const normNew = normalize(np.nombre);
  let bestOrig = null;
  let bestScore = 0;

  for (const op of originalProds) {
    const normOrig = normalize(op.nombre);
    if (normNew === normOrig) {
      bestOrig = op;
      bestScore = 1.0;
      break;
    }

    // Token overlap
    const tNew = new Set(normNew.split(' '));
    const tOrig = new Set(normOrig.split(' '));
    let inter = 0;
    for (const t of tNew) {
      if (tOrig.has(t)) inter++;
    }
    const score = inter / new Set([...tNew, ...tOrig]).size;
    if (score > bestScore) {
      bestScore = score;
      bestOrig = op;
    }
  }

  mappings.push({
    newProd: np,
    origProd: bestOrig,
    score: bestScore
  });
}

mappings.forEach((m, idx) => {
  console.log(`${idx + 1}. [NUEVO] "${m.newProd.nombre}" ($${m.newProd.precio_venta})`);
  console.log(`   <==> [ORIGINAL] "${m.origProd ? m.origProd.nombre : 'NONE'}" ($${m.origProd ? m.origProd.precio_venta : 0}) [Score: ${m.score.toFixed(2)}]`);
});

fs.writeFileSync(path.join(__dirname, 'mappings_41.json'), JSON.stringify(mappings, null, 2));
