const fs = require('fs');
const filePath = 'src/actions/cierres-actions.ts';
let content = fs.readFileSync(filePath, 'utf8');

const replacement1 = `export async function getCierreParaEditar(cierreId: string) {
  const supabase = await createClient();
  const { data: cierre, error } = await supabase
    .from('cierres_caja')
    .select('*')
    .eq('id', cierreId)
    .single();

  if (error || !cierre) return null;

  try {
    const previo = await getCierrePrevio(cierre.fecha_cierre, cierre.sede_id);
    cierre.sistema_total_esperado = previo.totalEsperado;
    cierre.sistema_ventas_brutas = previo.ventasTotales;
    cierre.sistema_gastos_operativos = previo.gastosTotales;
    if (previo.esperadoPorMetodo) {
      cierre.esperadoPorMetodo = previo.esperadoPorMetodo;
    }
  } catch (e) {
    console.error('Error recalculando cierre previo para edicion:', e);
  }

  const { data: transacciones } = await supabase
    .from('cierres_transacciones')
    .select('*')
    .eq('cierre_id', cierreId);

  return { cierre, transacciones: transacciones || [] };
}`;
content = content.replace(/export async function getCierreParaEditar[\s\S]*?return \{ cierre, transacciones: transacciones \|\| \[\] \};\s*\}/, replacement1);

const replacement2 = `.update({
      real_efectivo_bs: cierreData.real_efectivo_bs,
      real_efectivo_usd: cierreData.real_efectivo_usd,
      real_bancos_bs: cierreData.real_bancos_bs,
      real_bancos_usd: cierreData.real_bancos_usd,
      diferencia_total: cierreData.diferencia_total,
      sistema_ventas_brutas: cierreData.sistema_ventas_brutas,
      sistema_gastos_operativos: cierreData.sistema_gastos_operativos,
      sistema_total_esperado: cierreData.sistema_total_esperado,
        editado_por: user.id,
        fecha_edicion: new Date().toISOString()
      })`;
content = content.replace(/\.update\(\{[\s\S]*?fecha_edicion: new Date\(\)\.toISOString\(\)\s*\}\)/, replacement2);

fs.writeFileSync(filePath, content);
console.log('Done');