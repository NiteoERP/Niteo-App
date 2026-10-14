const fs = require('fs');

const menuItems = JSON.parse(fs.readFileSync('scripts/parsed_menu_items.json', 'utf8'));
const dbProds = JSON.parse(fs.readFileSync('scripts/db_existing_prods.json', 'utf8'));

const STOPWORDS = new Set(['de', 'con', 'y', 'la', 'el', 'en', 'los', 'las', 'por', 'a', 'un', 'una', 'del', 'para', 'al', 'o']);

function normalizeTokens(str) {
  if (!str) return [];
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && !STOPWORDS.has(t));
}

function normalize(str) {
  return normalizeTokens(str).join(' ');
}

// Token similarity with stopword removal
function tokenSimilarity(s1, s2) {
  const set1 = new Set(normalizeTokens(s1));
  const set2 = new Set(normalizeTokens(s2));
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersection = 0;
  for (const t of set1) {
    if (set2.has(t)) intersection++;
  }
  const union = new Set([...set1, ...set2]).size;
  return intersection / union;
}

// Deduplicate menuItems by exact or normalized name
const seenMenu = new Map();
for (const item of menuItems) {
  const norm = normalize(item.nombre);
  if (seenMenu.has(norm)) {
    const existing = seenMenu.get(norm);
    if ((item.ingredientes_o_descripcion && !existing.ingredientes_o_descripcion) || (item.contenido_combo && !existing.contenido_combo)) {
      seenMenu.set(norm, item);
    }
    continue;
  }
  seenMenu.set(norm, item);
}

const uniqueMenuItems = Array.from(seenMenu.values());

const results = [];

for (const item of uniqueMenuItems) {
  const itemNorm = normalize(item.nombre);
  const itemUpper = item.nombre.trim().toUpperCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const dbP of dbProds) {
    const dbNorm = normalize(dbP.nombre);
    const dbUpper = dbP.nombre.trim().toUpperCase();

    // 1. Exact match (exact string or exact normalized)
    if (itemUpper === dbUpper || itemNorm === dbNorm) {
      bestMatch = dbP;
      bestScore = 1.0;
      break;
    }

    // 2. Token similarity
    let score = tokenSimilarity(item.nombre, dbP.nombre);

    // Price similarity bonus/penalty
    const priceDiff = Math.abs(item.precio - (dbP.precio_venta || 0));
    if (score >= 0.5) {
      if (priceDiff === 0) {
        score += 0.25;
      } else if (priceDiff <= 1.5) {
        score += 0.1;
      } else if (priceDiff > 5) {
        // Heavy penalty if prices differ by more than $5 on ambiguous names
        score -= 0.35;
      }
    }

    // Keywords bonus (e.g. if one has 'cerveza' or 'balde' and other doesn't, or 'pizza')
    const itemDesc = (item.ingredientes_o_descripcion || '') + ' ' + (item.contenido_combo || '') + ' ' + item.nombre;
    const dbName = dbP.nombre.toLowerCase();
    if (dbName.includes('pizza') && itemDesc.toLowerCase().includes('pizza')) {
      score += 0.15;
    }
    if ((dbName.includes('cerveza') || dbName.includes('balde')) && (itemDesc.toLowerCase().includes('cerveza') || itemDesc.toLowerCase().includes('balde'))) {
      score += 0.15;
    }
    if (dbName.includes('burger') || dbName.includes('hamburguesa')) {
      if (item.seccion.toLowerCase().includes('burger') || itemDesc.toLowerCase().includes('hamburguesa')) {
        score += 0.15;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = dbP;
    }
  }

  // Acceptance threshold: score >= 0.70
  const isMatch = bestScore >= 0.70;

  results.push({
    item,
    matchedDb: isMatch ? bestMatch : null,
    score: bestScore,
    bestCandidate: bestMatch
  });
}

const matched = results.filter(r => r.matchedDb);
const unmatched = results.filter(r => !r.matchedDb);

console.log(`Total unique menu items: ${uniqueMenuItems.length}`);
console.log(`Matched to existing DB products: ${matched.length}`);
console.log(`Will be created as new products: ${unmatched.length}`);

console.log('\n--- VERIFYING SPECIAL CASES ---');
const promoFeria = results.find(r => r.item.nombre === 'PROMO DE FERIA');
if (promoFeria) {
  console.log('PROMO DE FERIA ($22) matched to:', promoFeria.matchedDb ? promoFeria.matchedDb.nombre + ' ($' + promoFeria.matchedDb.precio_venta + ')' : 'NONE');
}
const baldeFeria = results.find(r => r.item.nombre.includes('BALDE DE CERVEZAS PAGA 10'));
if (baldeFeria) {
  console.log(baldeFeria.item.nombre + ' ($10) matched to:', baldeFeria.matchedDb ? baldeFeria.matchedDb.nombre + ' ($' + baldeFeria.matchedDb.precio_venta + ')' : 'NONE');
}

fs.writeFileSync('scripts/menu_matching_plan.json', JSON.stringify(results, null, 2));
