const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

code = code.replace(
  /const nombre = prompt\('Ingresa el nombre del nuevo producto base:'\);/g,
  "setPromptModal({ isOpen: true, title: 'Ingresa el nombre del nuevo producto base:', value: '', onSubmit: (nombre) => {"
);
code = code.replace(
  /if \(nombre && nombre\.trim\(\)\) \{\s*setIsSubmitting\(true\);\s*crearProductoBase\(nombre\.trim\(\)\)\.then\(res => \{\s*if \(res\.success\) \{\s*setProductosDb\(prev => \[\.\.\.prev, res\.producto!\]\);\s*mostrarAlerta\('Producto creado\.', 'success'\);\s*setProductos\(prev => prev\.map\(p => \{\s*if \(p\.rowId === rowId\) \{\s*return \{ \.\.\.p, id_producto: res\.producto!\.id, precio: '0', total: '0' \};\s*\}\s*return p;\s*\}\)\);\s*\}\s*\}\);\s*\}/g,
  "if (nombre && nombre.trim()) { setIsSubmitting(true); crearProductoBase(nombre.trim()).then(res => { if (res.success) { setProductosDb(prev => [...prev, res.producto!]); mostrarAlerta('Producto creado.', 'success'); setProductos(prev => prev.map(p => { if (p.rowId === rowId) { return { ...p, id_producto: res.producto!.id, precio: '0', total: '0' }; } return p; })); } }); } } });"
);

code = code.replace(
  /const nombre = prompt\('Ingresa el nombre del nuevo proveedor \\(y RIF opcional separados por gui.*n\\):'\);/g,
  "setPromptModal({ isOpen: true, title: 'Ingresa el nombre del nuevo proveedor:', value: '', onSubmit: async (nombre) => {"
);
code = code.replace(
  /if \(nombre && nombre\.trim\(\)\) \{\s*setIsSubmitting\(true\);\s*const res = await crearProveedor\(nombre\.trim\(\)\);\s*if \(res\.success && res\.data\) \{\s*setProveedoresSugeridos\(prev => \[\.\.\.prev, res\.data\.nombre\]\);\s*setGasto\(prev => \(\{ \.\.\.prev, proveedor: res\.data\.nombre \}\)\);\s*setFactura\(prev => \(\{ \.\.\.prev, proveedor: res\.data\.nombre \}\)\);\s*mostrarAlerta\('Proveedor creado\.', 'success'\);\s*\} else \{\s*mostrarAlerta\('Error al crear proveedor\.', 'error'\);\s*\}\s*setIsSubmitting\(false\);\s*\}/g,
  "if (nombre && nombre.trim()) { setIsSubmitting(true); const res = await crearProveedor(nombre.trim()); if (res.success && res.data) { setProveedoresSugeridos(prev => [...prev, res.data.nombre]); setGasto(prev => ({ ...prev, proveedor: res.data.nombre })); setFactura(prev => ({ ...prev, proveedor: res.data.nombre })); mostrarAlerta('Proveedor creado.', 'success'); } else { mostrarAlerta('Error al crear proveedor.', 'error'); } setIsSubmitting(false); } } });"
);

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
