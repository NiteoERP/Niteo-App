const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/inventario/page.tsx', 'utf-8');

const newContent = `      {/* Contenido Dinámico */}
      <div className="pt-2">
        {currentTab === 'insumos' && (
          <InsumosManager initialInsumos={insumos} empresaId={empresaId} sedeId={activeSedeId || ''} />
        )}
        
        {currentTab === 'productos' && (
          <ProductosEnriquecidos 
            productos={productos} 
            insumos={insumos} 
            recetas={recetas} 
            empresaId={empresaId} 
          />
        )}

        {currentTab === 'transformaciones' && (
          <TransformacionesManager 
            insumos={insumos}
            activeSedeId={activeSedeId || ''} 
          />
        )}
      </div>`;

const startIndex = code.indexOf('{/* Contenido Din');
const endIndex = code.indexOf('</div>', code.indexOf('</ProductsEnriquecidos>', startIndex) || code.indexOf(')}', code.indexOf('ProductosEnriquecidos')));
// Just replace the whole Contenido Dinamico div.
code = code.replace(/\{\/\* Contenido Dinámico \*\/\}[\s\S]*?<\/div>/s, newContent);

// Fallback in case of encoding issues with "Dinámico"
code = code.replace(/\{\/\* Contenido Din.mico \*\/\}[\s\S]*?<\/div>/s, newContent);

fs.writeFileSync('src/app/dashboard/inventario/page.tsx', code);
