const fs = require('fs');
const items = JSON.parse(fs.readFileSync('scripts/parsed_menu_items.json', 'utf8'));

console.log('=== SUMMARY OF PARSED MENU ITEMS ===');
console.log('Total items:', items.length);

const combos = items.filter(i => i.es_combo);
console.log('\n=== COMBOS Y PROMOCIONES (' + combos.length + ') ===');
combos.forEach((c, idx) => {
  console.log(`${idx + 1}. [${c.nombre}] - $${c.precio}`);
  console.log(`   Notas Cocina: ${c.contenido_combo || c.ingredientes_o_descripcion}`);
});

const dishes = items.filter(i => !i.es_combo);
console.log('\n=== PLATOS REGULARES (' + dishes.length + ') ===');
dishes.slice(0, 15).forEach((d, idx) => {
  console.log(`${idx + 1}. [${d.nombre}] - $${d.precio} (${d.seccion})`);
  console.log(`   Ingredientes: ${d.ingredientes_o_descripcion}`);
});
