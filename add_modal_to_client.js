const fs = require('fs');

let c = fs.readFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', 'utf8');

c = c.replace(
    "import BulkRecetaModal from './BulkRecetaModal';",
    "import BulkRecetaModal from './BulkRecetaModal';\nimport DuplicarModal from './DuplicarModal';\nimport { Copy } from 'lucide-react';"
);

c = c.replace(
    "const [isBulkOpen, setIsBulkOpen] = useState(false);",
    "const [isBulkOpen, setIsBulkOpen] = useState(false);\n  const [isDuplicarOpen, setIsDuplicarOpen] = useState(false);"
);

const buttonsStr = `<button 
              onClick={() => { setEditingProd(null); setIsFormOpen(true); }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 whitespace-nowrap"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Nuevo Producto</span>
            </button>`;

const newButtonsStr = `<button 
              onClick={() => setIsDuplicarOpen(true)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-indigo-300 rounded-xl font-medium flex items-center gap-2 transition-all whitespace-nowrap border border-neutral-700/50"
              title="Duplicar Catálogo entre sedes"
            >
              <Copy size={18} /> <span className="hidden sm:inline">Duplicar Catálogo</span>
            </button>
            <button 
              onClick={() => { setEditingProd(null); setIsFormOpen(true); }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 whitespace-nowrap"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Nuevo Producto</span>
            </button>`;

c = c.replace(buttonsStr, newButtonsStr);

const modalStr = `<BulkRecetaModal 
        isOpen={isBulkOpen} 
        onClose={() => setIsBulkOpen(false)}
        productos={productos.filter(p => p.es_compuesto)}
        insumos={insumos}
      />`;

const newModalStr = `<BulkRecetaModal 
        isOpen={isBulkOpen} 
        onClose={() => setIsBulkOpen(false)}
        productos={productos.filter(p => p.es_compuesto)}
        insumos={insumos}
      />
      <DuplicarModal 
        isOpen={isDuplicarOpen} 
        onClose={() => setIsDuplicarOpen(false)}
        sedes={sedes}
      />`;

c = c.replace(modalStr, newModalStr);

fs.writeFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', c, 'utf8');
console.log('Success');
