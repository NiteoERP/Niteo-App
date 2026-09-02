const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/actions.ts', 'utf-8');

code = code.replace(`supabase.from('productos').select('id, nombre, costo').eq('empresa_id', idEmpresa).order('nombre')`, `supabase.from('inventario_insumos').select('id, nombre, costo:costo_promedio').eq('empresa_id', idEmpresa).order('nombre')`);

code = code.replace(`export async function crearProductoBase(nombre: string) {
  try {
    const { supabase, idEmpresa } = await getAuthContext();
    const { data, error } = await supabase.from('productos').insert({
      empresa_id: idEmpresa,
      nombre: nombre,
      precio_venta: 0,
      costo: 0,
      stock_actual: 0
    }).select('id, nombre, costo').single();`, `export async function crearProductoBase(nombre: string) {
  try {
    const { supabase, idEmpresa, idSede } = await getAuthContext();
    const { data, error } = await supabase.from('inventario_insumos').insert({
      empresa_id: idEmpresa,
      sede_id: idSede || null,
      nombre: nombre,
      unidad_medida: 'Unidades',
      costo_promedio: 0,
      cantidad_actual: 0
    }).select('id, nombre, costo:costo_promedio').single();`);

fs.writeFileSync('src/app/dashboard/compras/actions.ts', code);
