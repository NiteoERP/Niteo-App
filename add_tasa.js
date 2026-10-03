const fs = require('fs');
let content = fs.readFileSync('src/actions/config-actions.ts', 'utf8');

const newAction = `
export async function getTasaBcvForDateAction(dateStr: string) {
  const supabase = await createClient();
  try {
    let isEur = false;
    let tipoTasa = 'AUTO';
    let tasaManual = 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
      if (profile) {
        const { data: emp } = await supabase.from('empresas').select('moneda_referencia, tipo_tasa, tasa_manual').eq('id', profile.empresa_id).single();
        if (emp) {
          if (emp.moneda_referencia === 'EUR') isEur = true;
          tipoTasa = emp.tipo_tasa || 'AUTO';
          tasaManual = Number(emp.tasa_manual) || 0;
        }
      }
    }

    if (tipoTasa === 'MANUAL' && tasaManual > 0) {
      return { tasa: tasaManual, fecha: 'Manual', tipoTasa: 'MANUAL', moneda: isEur ? 'EUR' : 'USD' };
    }

    const { data } = await supabase
      .from('tasa_cambiaria')
      .select('tasa_bcv, tasa_eur, fecha')
      .lte('fecha', dateStr)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return { tasa: 36.50, fecha: null, tipoTasa: 'AUTO', moneda: isEur ? 'EUR' : 'USD' };
    
    const selectedRate = isEur ? (Number(data.tasa_eur) || Number(data.tasa_bcv)) : Number(data.tasa_bcv);
    return { tasa: selectedRate, fecha: data.fecha, tipoTasa: 'AUTO', moneda: isEur ? 'EUR' : 'USD' };
  } catch (err) {
    return { tasa: 36.50, fecha: null, tipoTasa: 'AUTO', moneda: 'USD' };
  }
}
`;

content += '\n' + newAction;
fs.writeFileSync('src/actions/config-actions.ts', content, 'utf8');