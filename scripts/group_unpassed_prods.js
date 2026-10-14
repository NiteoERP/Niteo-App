const fs = require('fs');
const unpassed = JSON.parse(fs.readFileSync('scripts/db_prods_not_in_images.json', 'utf8'));

const groups = {
  'PIZZAS Y CALZONES (Tradicionales, Especiales, Gourmet)': [],
  'BEBIDAS INDIVIDUALES Y LICORES (Refrescos, Cervezas, Agua, Jugos)': [],
  'POSTRES Y DULCES (Marquesas, Brownies, Tortas)': [],
  'ALMUERZOS Y PLATOS DE TRABAJADOR': [],
  'ADICIONALES, EXTRAS Y CONTORNOS': [],
  'OTROS PLATOS, ENTRADAS Y COMBOS ANTERIORES': []
};

unpassed.forEach(p => {
  const n = p.nombre.toUpperCase();
  if (n.includes('PIZZA') || n.includes('CALZONE') || n.includes('FOCACCIA')) {
    groups['PIZZAS Y CALZONES (Tradicionales, Especiales, Gourmet)'].push(p);
  } else if (n.includes('REFRESCO') || n.includes('COCA') || n.includes('POLAR') || n.includes('CERVEZA') || n.includes('AGUA') || n.includes('MALTA') || n.includes('JUGO') || n.includes('PEPSI') || n.includes('7UP') || n.includes('SANGRIA') || n.includes('VINO') || n.includes('RON') || n.includes('WHISKY') || n.includes('GATORADE') || n.includes('SODA') || n.includes('COLITA') || n.includes('SMIRNOFF') || n.includes('SOLERA') || n.includes('ZULIA')) {
    groups['BEBIDAS INDIVIDUALES Y LICORES (Refrescos, Cervezas, Agua, Jugos)'].push(p);
  } else if (n.includes('MARQUESA') || n.includes('BROWNIE') || n.includes('TORTA') || n.includes('DONA') || n.includes('HELADO') || n.includes('POSTRE')) {
    groups['POSTRES Y DULCES (Marquesas, Brownies, Tortas)'].push(p);
  } else if (n.includes('ALMUERZO') || n.includes('TRAB') || n.includes('EMPLEADO')) {
    groups['ALMUERZOS Y PLATOS DE TRABAJADOR'].push(p);
  } else if (n.includes('ADICIONAL') || n.includes('EXTRA') || n.includes('PORCION') || n.includes('SALSA') || n.includes('QUESO P/')) {
    groups['ADICIONALES, EXTRAS Y CONTORNOS'].push(p);
  } else {
    groups['OTROS PLATOS, ENTRADAS Y COMBOS ANTERIORES'].push(p);
  }
});

for (const [grp, prods] of Object.entries(groups)) {
  console.log(`\n=== ${grp} (${prods.length}) ===`);
  prods.slice(0, 15).forEach(p => console.log(`- ${p.nombre} ($${p.precio_venta})`));
  if (prods.length > 15) {
    console.log(`  ... y ${prods.length - 15} más.`);
  }
}

fs.writeFileSync('scripts/grouped_unpassed.json', JSON.stringify(groups, null, 2));
