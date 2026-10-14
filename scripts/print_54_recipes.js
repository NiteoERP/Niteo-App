const fs = require('fs');
const recs = JSON.parse(fs.readFileSync('scripts/a2_parsed_recipes.json', 'utf8'));
recs.forEach((r, idx) => {
  console.log(`${idx + 1}. [${r.prodName}] (${r.ingredientes.length} ingredientes)`);
});
