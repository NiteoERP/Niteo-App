const fs = require('fs');
const plan = JSON.parse(fs.readFileSync('scripts/menu_matching_plan.json', 'utf8'));
const unmatched = plan.filter(r => !r.matchedDb);
console.log('Total unmatched:', unmatched.length);
unmatched.forEach((r, idx) => {
  const dbName = r.bestCandidate ? r.bestCandidate.nombre : 'NONE';
  const dbPrice = r.bestCandidate ? r.bestCandidate.precio_venta : 0;
  console.log(`${idx + 1}. [${r.item.nombre}] ($${r.item.precio}) -> Best DB Candidate: [${dbName}] ($${dbPrice}) [Score: ${r.score.toFixed(2)}]`);
});
