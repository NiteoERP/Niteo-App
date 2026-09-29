const fs = require('fs');
const path = require('path');

// 1. pos-actions.ts
const posFile = path.join(__dirname, 'src', 'actions', 'pos-actions.ts');
let posCode = fs.readFileSync(posFile, 'utf8');

if (!posCode.includes('aplica_listas_precios:')) {
  // Update interface
  posCode = posCode.replace(
    "precio_modificable?: boolean;",
    "precio_modificable?: boolean;\n  aplica_listas_precios?: boolean;"
  );
  // Update Select query
  posCode = posCode.replace(
    ".select('id, codigo_barras, nombre, precio_venta, costo, precio_modificable, productos_precios(lista_precio_id, precio)')",
    ".select('id, codigo_barras, nombre, precio_venta, costo, precio_modificable, aplica_listas_precios, productos_precios(lista_precio_id, precio)')"
  );
  // Update Map
  posCode = posCode.replace(
    "precio_modificable: p.precio_modificable,",
    "precio_modificable: p.precio_modificable,\n      aplica_listas_precios: p.aplica_listas_precios,"
  );
  fs.writeFileSync(posFile, posCode);
}

// 2. catalogo-actions.ts
const catFile = path.join(__dirname, 'src', 'actions', 'catalogo-actions.ts');
let catCode = fs.readFileSync(catFile, 'utf8');

if (!catCode.includes('aplica_listas_precios: data.aplica_listas_precios')) {
  catCode = catCode.replace(
    "precio_modificable: !!data.precio_modificable,",
    "precio_modificable: !!data.precio_modificable,\n        aplica_listas_precios: data.aplica_listas_precios !== undefined ? !!data.aplica_listas_precios : true,"
  );
  // Do it for both createProducto and updateProducto
  catCode = catCode.replace(
    "precio_modificable: !!data.precio_modificable,",
    "precio_modificable: !!data.precio_modificable,\n        aplica_listas_precios: data.aplica_listas_precios !== undefined ? !!data.aplica_listas_precios : true,"
  );
  fs.writeFileSync(catFile, catCode);
}

// 3. ProductoForm.tsx
const formFile = path.join(__dirname, 'src', 'app', 'dashboard', 'catalogo', 'ProductoForm.tsx');
let formCode = fs.readFileSync(formFile, 'utf8');

if (!formCode.includes('aplica_listas_precios:')) {
  // Add to formData state
  formCode = formCode.replace(
    "precio_modificable: initialData?.precio_modificable || false,",
    "precio_modificable: initialData?.precio_modificable || false,\n      aplica_listas_precios: initialData?.aplica_listas_precios !== undefined ? initialData.aplica_listas_precios : true,"
  );

  // Add UI Toggle
  const toggleUI = `
                <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3">
                  <div>
                    <label className="text-sm font-medium text-white">Aplicar Precios Dinámicos</label>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Permitir que las listas de porcentaje afecten este producto</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, aplica_listas_precios: !prev.aplica_listas_precios }))}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {formData.aplica_listas_precios ? <ToggleRight size={32} className="text-emerald-500" /> : <ToggleLeft size={32} />}
                  </button>
                </div>
  `;
  
  formCode = formCode.replace(
    '<div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-4">',
    toggleUI + '\n              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-4">'
  );
  fs.writeFileSync(formFile, formCode);
}

// 4. TerminalVirtual.tsx
const termFile = path.join(__dirname, 'src', 'components', 'pos', 'TerminalVirtual.tsx');
let termCode = fs.readFileSync(termFile, 'utf8');

if (!termCode.includes('prod.aplica_listas_precios === false')) {
  termCode = termCode.replace(
    "if (lista.tipo_calculo === 'PORCENTAJE_BASE') {",
    "if (lista.tipo_calculo === 'PORCENTAJE_BASE') {\n      if (prod.aplica_listas_precios === false) return prod.precio_venta;"
  );
  fs.writeFileSync(termFile, termCode);
}
