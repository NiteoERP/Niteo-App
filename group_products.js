const fs = require('fs');

let c = fs.readFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', 'utf8');

const filterRegex = /const filtered = productos.filter\(\(p\s*(:\s*any)?\) => \{[\s\S]*?return matchesSearch && matchesCat && matchesSede;\s*\}\);/;

const newFilterLogic = `  // 1. First group identical products by name so we know how many sedes they belong to
  const productsByName = new Map<string, any[]>();
  productos.forEach(p => {
    const key = (p.nombre || '').toLowerCase().trim();
    if (!productsByName.has(key)) productsByName.set(key, []);
    productsByName.get(key)!.push(p);
  });

  // 2. Add sedes_asociadas array to each product for UI
  const productsWithSedes = productos.map(p => {
    const key = (p.nombre || '').toLowerCase().trim();
    const group = productsByName.get(key) || [];
    const sedes_ids = [...new Set(group.map(g => g.sede_id).filter(Boolean))];
    return { ...p, sedes_asociadas: sedes_ids };
  });

  // 3. Optional: Deduplicate rows if "Todas las sedes" is selected to avoid clutter?
  // User asked: "si ambas sedes tiene el mismo producto me gustaria que ambas salieran en la etiqueta"
  // If we deduplicate visually, they only see one row per product name. Let's do that if no sede is selected!
  let displayProducts = productsWithSedes;
  if (!selectedSede) {
    const seen = new Set();
    displayProducts = productsWithSedes.filter(p => {
      const key = (p.nombre || '').toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const filtered = displayProducts.filter(p => {
    const matchesSearch = (p.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.codigo_barras?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCat = !selectedCategoria || p.categoria_id === selectedCategoria;
    const matchesSede = !selectedSede || p.sede_id === selectedSede;
    return matchesSearch && matchesCat && matchesSede;
  });`;

c = c.replace(filterRegex, newFilterLogic);

// Now update the UI to show `p.sedes_asociadas` if it exists
// Mobile view
const mobileSede = `{sedes.find(s => s.id === p.sede_id)?.nombre_sede || 'Desconocida'}`;
const newMobileSede = `{p.sedes_asociadas?.length > 1 
                    ? \`\${sedes.find(s => s.id === p.sede_id)?.nombre_sede || 'Múltiples'} (+\${p.sedes_asociadas.length - 1} sedes)\` 
                    : sedes.find(s => s.id === p.sede_id)?.nombre_sede || 'Desconocida'}`;

// Replace mobile view (ensure we only replace the tag content)
const mobileSpan = `<span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-medium truncate max-w-[100px]">\n                  {sedes.find(s => s.id === p.sede_id)?.nombre_sede || 'Desconocida'}\n                </span>`;
const newMobileSpan = `<span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-medium truncate max-w-[150px]">
                  ${newMobileSede}
                </span>`;
c = c.replace(mobileSpan, newMobileSpan);

// Desktop view
const desktopSpan = `<span className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">\n                      {sedes.find(s => s.id === p.sede_id)?.nombre_sede || 'Desconocida'}\n                    </span>`;
const newDesktopSpan = `<span className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                      ${newMobileSede}
                    </span>`;
c = c.replace(desktopSpan, newDesktopSpan);

fs.writeFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', c, 'utf8');
console.log('Success UI grouping');
