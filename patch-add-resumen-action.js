const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

const newAction = `
// ============================================================================
// REPORTE DE RESUMEN DE PAGOS DIARIOS
// ============================================================================
export async function getResumenPagos(fechaInicio: string, fechaFin: string, sedeId: string = 'ALL') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", data: null };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id, sede_id, rol').eq('id', user.id).single();
  if (!profile) return { error: "Perfil no encontrado", data: null };

  let query = supabase
    .from('cierres_transacciones')
    .select(\`
      monto,
      moneda,
      metodo,
      cierres_caja!inner(
        fecha_cierre,
        tasa_cambio,
        sede_id,
        empresa_id
      )
    \`)
    .eq('cierres_caja.empresa_id', profile.empresa_id)
    .gte('cierres_caja.fecha_cierre', fechaInicio)
    .lte('cierres_caja.fecha_cierre', fechaFin);

  if (profile.rol !== 'MASTER') {
    query = query.eq('cierres_caja.sede_id', profile.sede_id);
  } else if (sedeId && sedeId !== 'ALL') {
    query = query.eq('cierres_caja.sede_id', sedeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching resumen:', error);
    return { error: 'Error cargando el resumen', data: null };
  }

  const grouped: Record<string, { fecha: string, total_usd: number, metodos: Record<string, number> }> = {};

  data.forEach((row: any) => {
    const c = row.cierres_caja;
    if (!c) return;

    const fecha = c.fecha_cierre;
    if (!grouped[fecha]) {
      grouped[fecha] = { fecha, total_usd: 0, metodos: {} };
    }

    const monto = Number(row.monto) || 0;
    const isVES = row.moneda === 'VES';
    const amountUSD = isVES ? monto / (c.tasa_cambio || 1) : monto;

    const metodo = row.metodo?.toUpperCase() || 'DESCONOCIDO';

    if (!grouped[fecha].metodos[metodo]) {
      grouped[fecha].metodos[metodo] = 0;
    }
    
    grouped[fecha].metodos[metodo] += amountUSD;
    grouped[fecha].total_usd += amountUSD;
  });

  const result = Object.values(grouped).sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { error: null, data: result };
}
`;

fs.writeFileSync('src/actions/cierres-actions.ts', code + newAction);
