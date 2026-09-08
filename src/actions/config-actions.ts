'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

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
      .maybeSingle();

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());

    // Si no hay datos o la última tasa registrada no corresponde al día de hoy, sincronizar vía Edge Function
    if (!data || data.fecha < today) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
          const syncRes = await fetch(`${supabaseUrl}/functions/v1/sync-tasa-bcv`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.success && syncData.usdRate) {
              const freshRate = isEur ? (Number(syncData.eurRate) || Number(syncData.usdRate)) : Number(syncData.usdRate);
              return { tasa: freshRate, fecha: syncData.date };
            }
          }
        }
      } catch (syncErr) {
        console.warn('Auto-sync fallback error in getTasaBcvAction:', syncErr);
      }
    }

    if (!data) return { tasa: 804.81, fecha: null };

    const selectedRate = isEur ? (Number(data.tasa_eur) || Number(data.tasa_bcv)) : Number(data.tasa_bcv);
    return { tasa: selectedRate, fecha: data.fecha };
  } catch (err) {
    return { tasa: 804.81, fecha: null };
  }
}

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
