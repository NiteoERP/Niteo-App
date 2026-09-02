const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/inventario/page.tsx', 'utf-8');

// 1. Add import
if (!code.includes('import TransformacionesManager')) {
  code = code.replace("import InsumosManager from './InsumosManager';", "import InsumosManager from './InsumosManager';\nimport TransformacionesManager from './TransformacionesManager';\nimport { ArrowRightLeft } from 'lucide-react';");
}

// 2. Add Tab
const newTabs = `        {/* Tabs / Navegación */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-px">
          <a 
            href={\`?tab=insumos\${activeSedeId ? \`&sede=\${activeSedeId}\` : ''}\`} 
            className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 \${currentTab === 'insumos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}\`}
          >
            <FileBox size={16} /> Almacén (Insumos)
          </a>
          <a 
            href={\`?tab=productos\${activeSedeId ? \`&sede=\${activeSedeId}\` : ''}\`} 
            className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 \${currentTab === 'productos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}\`}
          >
            <Package size={16} /> Productos de Venta
          </a>
          <a 
            href={\`?tab=transformaciones\${activeSedeId ? \`&sede=\${activeSedeId}\` : ''}\`} 
            className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 \${currentTab === 'transformaciones' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}\`}
          >
            <ArrowRightLeft size={16} /> Transformaciones
          </a>
        </div>`;

// Use simple string replacement for the tabs div block
const startIndex = code.indexOf('{/* Tabs / Navegaci');
const endIndex = code.indexOf('</div>', startIndex);
if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newTabs + code.substring(endIndex + 6);
}

// 3. Add Component renderer
const newContent = `      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {currentTab === 'insumos' && (
          <InsumosManager sedes={sedesData} activeSedeId={activeSedeId} insumos={insumosData} />
        )}
        {currentTab === 'productos' && (
          <ProductosEnriquecidos 
            sedes={sedesData} 
            activeSedeId={activeSedeId} 
            productos={productosData}
            insumos={insumosData}
          />
        )}
        {currentTab === 'transformaciones' && (
          <TransformacionesManager 
            insumos={insumosData}
            activeSedeId={activeSedeId} 
          />
        )}
      </div>`;

const contentStartIndex = code.indexOf('<div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">');
const contentEndIndex = code.indexOf('</div>', code.indexOf(')}', contentStartIndex));

if (contentStartIndex !== -1 && contentEndIndex !== -1) {
    code = code.substring(0, contentStartIndex) + newContent + code.substring(contentEndIndex + 6);
}

fs.writeFileSync('src/app/dashboard/inventario/page.tsx', code);
