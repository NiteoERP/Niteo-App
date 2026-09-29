const fs = require('fs');

let c = fs.readFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', 'utf8');

const targetBtn = `<button 
            onClick={() => { setEditingProd(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus size={16} /> Crear Producto
          </button>`;

const newBtn = `<button 
            onClick={() => setIsDuplicarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-indigo-300 rounded-lg font-medium transition-colors text-sm border border-neutral-700/50"
            title="Duplicar Catálogo entre sedes"
          >
            <Copy size={16} /> <span className="hidden sm:inline">Duplicar Catálogo</span>
          </button>
          <button 
            onClick={() => { setEditingProd(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus size={16} /> Crear Producto
          </button>`;

if (c.includes('Crear Producto')) {
    c = c.replace(targetBtn, newBtn);
} else {
    console.log("NOT FOUND CREAR PRODUCTO");
}

fs.writeFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', c, 'utf8');
console.log('Fixed CatalogoClient');
