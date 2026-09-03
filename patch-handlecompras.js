const fs = require('fs');
let code = fs.readFileSync('src/actions/informes-actions.ts', 'utf-8');

const updatedLogic = `
async function handleComprasReports(supabase: any, reportId: string, empresaId: string, sedeId: string | null, start: string, end: string) {
  if (reportId === 'compras_proveedores') {
    const query = supabase
      .from('compras_puntuales')
      .select('id, proveedor, fecha_registro, monto_divisas, monto_bs, tasa_cambio, detalles, metodo_pago')
      .eq('id_empresa', empresaId)
      .gte('fecha_registro', start)
      .lte('fecha_registro', end)
      .order('fecha_registro', { ascending: false });

    if (sedeId) query.eq('id_sede', sedeId);
    
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const mappedData = data.map((d: any) => ({
      fecha_registro: d.fecha_registro,
      proveedor: d.proveedor || 'Sin Nombre',
      monto_divisas: d.monto_divisas,
      monto_bs: d.monto_bs,
      tasa_cambio: d.tasa_cambio,
      metodo_pago: d.metodo_pago,
      detalles: typeof d.detalles === 'string' && d.detalles.includes('{') 
        ? JSON.parse(d.detalles).texto 
        : d.detalles
    }));

    return { success: true, data: mappedData };
  }
  
  if (reportId === 'compras_metodos_pago') {
    const query = supabase
      .from('compras_puntuales')
      .select('metodo_pago, monto_divisas, monto_bs')
      .eq('id_empresa', empresaId)
      .gte('fecha_registro', start)
      .lte('fecha_registro', end);
      
    if (sedeId) query.eq('id_sede', sedeId);
    
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const summary: Record<string, { metodo: string; total_divisas: number; total_bs: number; cantidad: number }> = {};
    
    for (const row of data) {
      const m = row.metodo_pago || 'Desconocido';
      if (!summary[m]) summary[m] = { metodo: m, total_divisas: 0, total_bs: 0, cantidad: 0 };
      summary[m].total_divisas += Number(row.monto_divisas || 0);
      summary[m].total_bs += Number(row.monto_bs || 0);
      summary[m].cantidad += 1;
    }

    return { success: true, data: Object.values(summary).sort((a,b) => b.total_divisas - a.total_divisas) };
  }
  
  return { success: false, error: 'Unknown report' };
}
`;

// Use regex to replace the function entirely
code = code.replace(/async function handleComprasReports[\s\S]*?Unknown report' };\s*\}/, updatedLogic.trim());

fs.writeFileSync('src/actions/informes-actions.ts', code);
console.log("handleComprasReports patched");
