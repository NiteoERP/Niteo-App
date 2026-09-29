const fs = require('fs');

let content = fs.readFileSync('src/components/mesas/NuevaComanda.tsx', 'utf-8');

// 1. Add Search state and Search icon
content = content.replace(
    "User } from 'lucide-react'",
    "User, Search, Minus } from 'lucide-react'"
);

// Add search state
content = content.replace(
    "  const [catActiva, setCatActiva] = useState('Todos');",
    "  const [catActiva, setCatActiva] = useState('Todos');\n  const [busqueda, setBusqueda] = useState('');"
);

// 2. Modify prodsFiltrados logic
const oldFiltrados = `  const prodsFiltrados = catActiva === 'Todos'
    ? productos
    : productos.filter((p: any) => (p.categorias?.nombre || 'Sin categorÃ­a') === catActiva);`;
const oldFiltradosFallback = `  const prodsFiltrados = catActiva === 'Todos'\n      ? productos\n      : productos.filter((p: any) => (p.categorias?.nombre || 'Sin categorÃ­a') === catActiva);`;
const oldFiltradosFallback2 = `  const prodsFiltrados = catActiva === 'Todos'\n    ? productos\n    : productos.filter((p: any) => (p.categorias?.nombre || 'Sin categoría') === catActiva);`;

const newFiltrados = `  const prodsFiltrados = productos.filter((p: any) => {
    const matchCat = catActiva === 'Todos' || (p.categorias?.nombre || 'Sin categoría') === catActiva;
    const matchSearch = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchSearch;
  });
  
  const getCartInfo = (prodId: string) => {
    const items = carrito.filter(i => i.producto_id === prodId);
    if (items.length === 0) return null;
    const totalCantidad = items.reduce((s, i) => s + i.cantidad, 0);
    return { totalCantidad };
  };`;

if (content.includes("const prodsFiltrados = catActiva === 'Todos'")) {
    const regex = /  const prodsFiltrados = catActiva === 'Todos'\s*\?\s*productos\s*:\s*productos\.filter\(\(p: any\) => \(p\.categorias\?\.nombre \|\| 'Sin categor(?:Ã\xada|ía)'\) === catActiva\);/;
    content = content.replace(regex, newFiltrados);
}

// 3. Add Search Input UI
const oldFiltrosUi = /      \{\/\* Filtros de categor(?:Ã\xada|ía) \*\/}\s*<div className="flex gap-2 overflow-x-auto pb-1 \[\&::-webkit-scrollbar\]:hidden">/;

const newFiltrosUi = `      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
        <input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filtros de categoría */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">`;

content = content.replace(oldFiltrosUi, newFiltrosUi);

// 4. Modify Product Card rendering
const oldProductCard = /          <div className="grid grid-cols-2 gap-2">\s*\{prodsFiltrados\.map\(\(prod: any\) => \(\s*<button\s*key=\{prod\.id\}\s*onClick=\{\(\) => agregarAlCarrito\(prod\)\}\s*className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 p-3 rounded-2xl flex flex-col items-start justify-between min-h-\[100px\] transition-all text-left group"\s*>\s*<span className="font-bold text-neutral-200 text-sm group-hover:text-white line-clamp-2 leading-tight">\s*\{prod\.nombre\}\s*<\/span>\s*<span className="text-indigo-400 font-bold mt-2">\$\{Number\(prod\.precio_venta\)\.toFixed\(2\)\}<\/span>\s*<\/button>\s*\)\}\s*<\/div>/;

const newProductCard = `          <div className="grid grid-cols-2 gap-2">
            {prodsFiltrados.map((prod: any) => {
              const cartInfo = getCartInfo(prod.id);
              const inCart = !!cartInfo;
              return (
                <div key={prod.id} className="relative h-full">
                  <button
                    onClick={() => agregarAlCarrito(prod)}
                    className={\`w-full h-full bg-neutral-900 border p-3 rounded-2xl flex flex-col items-start justify-between min-h-[100px] transition-all text-left group \${
                      inCart ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800'
                    }\`}
                  >
                    <span className={\`font-bold text-sm line-clamp-2 leading-tight \${inCart ? 'text-white' : 'text-neutral-200 group-hover:text-white'}\`}>
                      {prod.nombre}
                    </span>
                    <span className="text-indigo-400 font-bold mt-2">\${Number(prod.precio_venta).toFixed(2)}</span>
                  </button>
                  
                  {inCart && (
                    <div className="absolute top-2 right-2 flex items-center bg-indigo-600 rounded-lg shadow-lg overflow-hidden border border-indigo-500">
                      <span className="px-2 py-1 text-xs font-bold text-white bg-indigo-600 select-none">
                        {cartInfo.totalCantidad}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCarrito(prev => prev.filter(i => i.producto_id !== prod.id));
                        }}
                        className="p-1 bg-rose-500 hover:bg-rose-400 transition-colors border-l border-indigo-500/30"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>`;

content = content.replace(oldProductCard, newProductCard);

fs.writeFileSync('src/components/mesas/NuevaComanda.tsx', content, 'utf-8');
console.log("Updated NuevaComanda.tsx");
