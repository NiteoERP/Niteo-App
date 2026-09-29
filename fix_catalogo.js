const fs = require('fs');

let c = fs.readFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', 'utf8');

// 1. Add state
c = c.replace(
    "const [selectedCategoria, setSelectedCategoria] = useState('');",
    "const [selectedCategoria, setSelectedCategoria] = useState('');\n  const [selectedSede, setSelectedSede] = useState('');"
);

// 2. Filter logic
const filterRegex = /const matchesCategoria = selectedCategoria === '' \|\| p\.categoria_id === selectedCategoria;\s*return matchesSearch && matchesCategoria;/;
if (c.match(filterRegex)) {
    c = c.replace(filterRegex, `const matchesCategoria = selectedCategoria === '' || p.categoria_id === selectedCategoria;\n      const matchesSede = selectedSede === '' || p.sede_id === selectedSede;\n      return matchesSearch && matchesCategoria && matchesSede;`);
} else {
    // If different regex
    const filterFallback = /const matchesCategoria = selectedCategoria === '' \|\| \(p\.categorias\?\.id === selectedCategoria \|\| p\.categoria_id === selectedCategoria\);\s*return matchesSearch && matchesCategoria;/;
    c = c.replace(filterFallback, `const matchesCategoria = selectedCategoria === '' || (p.categorias?.id === selectedCategoria || p.categoria_id === selectedCategoria);\n      const matchesSede = selectedSede === '' || p.sede_id === selectedSede;\n      return matchesSearch && matchesCategoria && matchesSede;`);
}

// 3. Dropdown UI
const dropdownStr = `<select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none transition-colors shrink-0"
          >
            <option value="">Todas las categorías</option>`;
const dropdownStrAlt = `<select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none transition-colors shrink-0"
          >
            <option value="">Todas las categorÃ­as</option>`;

const newDropdowns = `<select
            value={selectedSede}
            onChange={(e) => setSelectedSede(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-sm text-indigo-300 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none transition-colors shrink-0 max-w-[140px] truncate"
          >
            <option value="">Todas las sedes</option>
            {sedes.map(s => (
              <option key={s.id} value={s.id}>{s.nombre_sede}</option>
            ))}
          </select>
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none transition-colors shrink-0 max-w-[140px] truncate"
          >
            <option value="">Todas las categorías</option>`;

c = c.replace(dropdownStr, newDropdowns);
c = c.replace(dropdownStrAlt, newDropdowns.replace('Todas las categorías', 'Todas las categorÃ­as'));

// 4. Mobile layout addition
const mobileLayoutStr = `              <div className="flex items-center gap-2 mt-1">`;
const newMobileLayoutStr = `              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-medium truncate max-w-[100px]">
                  {sedes.find(s => s.id === p.sede_id)?.nombre_sede || 'Desconocida'}
                </span>`;
c = c.replace(mobileLayoutStr, newMobileLayoutStr);

// 5. Desktop table header
const thStr = `<th className="px-6 py-4 font-medium">Categoría</th>`;
const thStrAlt = `<th className="px-6 py-4 font-medium">CategorÃ­a</th>`;
const newTh = `<th className="px-6 py-4 font-medium">Sucursal</th>\n                <th className="px-6 py-4 font-medium">Categoría</th>`;
const newThAlt = `<th className="px-6 py-4 font-medium">Sucursal</th>\n                <th className="px-6 py-4 font-medium">CategorÃ­a</th>`;
c = c.replace(thStr, newTh);
c = c.replace(thStrAlt, newThAlt);

// 6. Desktop table body
const tdStr = `<td className="px-6 py-4">
                    {p.categorias?.nombre ? (`;
const newTd = `<td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                      {sedes.find(s => s.id === p.sede_id)?.nombre_sede || 'Desconocida'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.categorias?.nombre ? (`;
c = c.replace(tdStr, newTd);

fs.writeFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', c, 'utf8');
console.log('Success');
