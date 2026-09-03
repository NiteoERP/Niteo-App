const fs = require('fs');

let code = fs.readFileSync('src/actions/config-actions.ts', 'utf-8');

const newGetTasa = `
export async function getTasaBcvAction() {
  noStore();
  const supabase = await createClient();

  try {
    let isEur = false;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
       const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
       if (profile) {
          const { data: emp } = await supabase.from('empresas').select('moneda_referencia').eq('id', profile.empresa_id).single();
          if (emp && emp.moneda_referencia === 'EUR') isEur = true;
       }
    }

    const { data, error } = await supabase
      .from('tasa_cambiaria')
      .select('tasa_bcv, tasa_eur, fecha')
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return { tasa: 36.50, fecha: null };

    const selectedRate = isEur ? (Number(data.tasa_eur) || Number(data.tasa_bcv)) : Number(data.tasa_bcv);
    return { tasa: selectedRate, fecha: data.fecha };
  } catch (err) {
    return { tasa: 36.50, fecha: null };
  }
}
`;

code = code.replace(/export async function getTasaBcvAction\(\) \{[\s\S]*?\} catch \(err\) \{\s*return \{ tasa: 36\.50, fecha: null \};\s*\}\s*\}/, newGetTasa.trim());

const newUpdateTasa = `
export async function updateTasaBcvAction(nuevaTasa: number, isEur: boolean = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    // Obtenemos registro actual para no pisar la otra tasa
    const { data: actual } = await supabase.from('tasa_cambiaria').select('tasa_bcv, tasa_eur').eq('fecha', today).single();
    
    const objToSave: any = { fecha: today };
    if (isEur) {
       objToSave.tasa_eur = nuevaTasa;
       objToSave.tasa_bcv = actual?.tasa_bcv || nuevaTasa;
    } else {
       objToSave.tasa_bcv = nuevaTasa;
       objToSave.tasa_eur = actual?.tasa_eur || nuevaTasa;
    }

    const { error } = await supabase
      .from('tasa_cambiaria')
      .upsert(objToSave, { onConflict: 'fecha' });

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getEmpresaMonedaAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, moneda: 'USD' };
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, moneda: 'USD' };
  const { data: emp } = await supabase.from('empresas').select('moneda_referencia').eq('id', profile.empresa_id).single();
  return { success: true, moneda: emp?.moneda_referencia || 'USD' };
}

export async function updateEmpresaMonedaAction(moneda: 'USD' | 'EUR') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };
  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false };
  
  await supabase.from('empresas').update({ moneda_referencia: moneda }).eq('id', profile.empresa_id);
  revalidatePath('/dashboard');
  return { success: true };
}
`;

code = code.replace(/export async function updateTasaBcvAction[\s\S]*?return \{ success: false, error: err\.message \};\s*\}\s*\}/, newUpdateTasa.trim());

fs.writeFileSync('src/actions/config-actions.ts', code);
console.log("config-actions.ts patched for multi-currency");
