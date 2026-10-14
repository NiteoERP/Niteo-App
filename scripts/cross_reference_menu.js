const fs = require('fs');

const menuItems = JSON.parse(fs.readFileSync('scripts/parsed_menu_items.json', 'utf8'));
const dbProds = JSON.parse(fs.readFileSync('scripts/db_existing_prods.json', 'utf8'));

// Build lookup map for DB products
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ' ')      // replace non-alphanumeric with space
    .replace(/\s+/g, ' ')
    .trim();
}

const dbByName = new Map();
const dbByNorm = new Map();

for (const p of dbProds) {
  const norm = normalize(p.nombre);
  dbByName.set(p.nombre.trim().toUpperCase(), p);
  if (!dbByNorm.has(norm)) {
    dbByNorm.set(norm, p);
  }
}

const exactMatches = [];
const normMatches = [];
const newItems = [];

// Deduplicate menuItems by exact or normalized name if same item appears twice in different promo cards
const seenMenu = new Map();
for (const item of menuItems) {
  const norm = normalize(item.nombre);
  if (seenMenu.has(norm)) {
    const existing = seenMenu.get(norm);
    // Keep the one with more description or higher price if reasonable
    if ((item.ingredientes_o_descripcion && !existing.ingredientes_o_descripcion) || (item.contenido_combo && !existing.contenido_combo)) {
      seenMenu.set(norm, item);
    }
    continue;
  }
  seenMenu.set(norm, item);
}

const uniqueMenuItems = Array.from(seenMenu.values());
console.log(`Unique menu items from images: ${uniqueMenuItems.length} (from ${menuItems.length} parsed)`);

for (const item of uniqueMenuItems) {
  const upper = item.nombre.trim().toUpperCase();
  const norm = normalize(item.nombre);

  if (dbByName.has(upper)) {
    exactMatches.push({ item, db: dbByName.get(upper) });
  } else if (dbByNorm.has(norm)) {
    normMatches.push({ item, db: dbByNorm.get(norm) });
  } else {
    // Try finding substring match in DB
    let found = null;
    for (const [dbNorm, dbP] of dbByNorm.entries()) {
      if (dbNorm.length > 5 && (dbNorm === norm || norm.includes(dbNorm) || dbNorm.includes(norm))) {
        found = dbP;
        break;
      }
    }
    if (found) {
      normMatches.push({ item, db: found });
    } else {
      newItems.push(item);
    }
  }
}

console.log(`\nExact matches in DB: ${exactMatches.length}`);
console.log(`Normalized/close matches in DB: ${normMatches.length}`);
console.log(`Brand new items to create: ${newItems.length}`);

console.log('\n--- SAMPLE EXACT MATCHES ---');
exactMatches.slice(0, 10).forEach(m => {
  console.log(`Menu: "${m.item.nombre}" ($${m.item.precio}) <==> DB: "${m.db.nombre}" ($${m.db.precio_venta}) [es_compuesto: ${m.db.es_compuesto}]`);
});

console.log('\n--- SAMPLE CLOSE MATCHES ---');
normMatches.slice(0, 10).forEach(m => {
  console.log(`Menu: "${m.item.nombre}" ($${m.item.precio}) <==> DB: "${m.db.nombre}" ($${m.db.precio_venta})`);
});

console.log('\n--- SAMPLE NEW ITEMS ---');
newItems.slice(0, 15).forEach(i => {
  console.log(`New: "${i.nombre}" ($${i.precio}) [es_combo: ${i.es_combo}, seccion: ${i.seccion}]`);
});
