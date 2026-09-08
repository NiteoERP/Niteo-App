'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

/**
 * Scraping directo del portal oficial del BCV (https://www.bcv.org.ve).
 * Extrae las tasas USD, EUR y la 'Fecha Valor' (que entre las 4 y 7 PM corresponde al día siguiente hábil).
 */
export async function syncBcvDirectAction() {
  try {
    // El certificado SSL del BCV suele tener problemas de cadena en peticiones automáticas
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    let usdRate = 0;
    let eurRate = 0;
    let fechaValor: string | null = null;

    try {
      const res = await fetch('https://www.bcv.org.ve', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const html = await res.text();
        const usdMatch = html.match(/<span>\s*USD\s*<\/span>[\s\S]*?<strong[^>]*>\s*([0-9.,]+)\s*<\/strong>/i);
        const eurMatch = html.match(/<span>\s*EUR\s*<\/span>[\s\S]*?<strong[^>]*>\s*([0-9.,]+)\s*<\/strong>/i);
        const dateMatch = html.match(/content="([0-9]{4}-[0-9]{2}-[0-9]{2})/i);

        if (usdMatch && usdMatch[1]) {
          usdRate = parseFloat(usdMatch[1].trim().replace(/\./g, '').replace(',', '.'));
          eurRate = eurMatch && eurMatch[1] ? parseFloat(eurMatch[1].trim().replace(/\./g, '').replace(',', '.')) : usdRate;
          fechaValor = dateMatch ? dateMatch[1] : null;
        }
      }
    } catch (scrapeErr) {
      console.warn('Scrape directo BCV falló, recurriendo a API de respaldo:', scrapeErr);
    }

    // Si falló el scrape directo, recurrimos a DolarApi como respaldo
    if (!usdRate || isNaN(usdRate) || usdRate <= 0) {
      const usdRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { cache: 'no-store' });
      if (usdRes.ok) {
        const d = await usdRes.json();
        usdRate = parseFloat(d.promedio);
      }
      const eurRes = await fetch('https://ve.dolarapi.com/v1/euros', { cache: 'no-store' });
      if (eurRes.ok) {
        const d = await eurRes.json();
        const ofEur = Array.isArray(d) ? d.find((e: any) => e.fuente === 'oficial') : d;
        if (ofEur && ofEur.promedio) eurRate = parseFloat(ofEur.promedio);
      }
    }

    if (!usdRate || usdRate <= 0) {
      return { success: false, error: 'No se pudo obtener la tasa oficial del BCV.' };
    }

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());
    // Si la Fecha Valor publicada es igual o posterior a hoy (ej: día siguiente), la usamos
    const targetDate = (fechaValor && fechaValor >= today) ? fechaValor : today;

    const supabase = await createClient();
    const { error } = await supabase
      .from('tasa_cambiaria')
      .upsert({ fecha: targetDate, tasa_bcv: usdRate, tasa_eur: eurRate || usdRate }, { onConflict: 'fecha' });

    if (error) throw error;

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/configuracion');

    return {
      success: true,
      usdRate,
      eurRate: eurRate || usdRate,
      fecha: targetDate,
      isNextDay: targetDate > today
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene la tasa activa para la empresa del usuario actual.
 * Si la empresa configuró 'MANUAL', retorna la tasa manual sin consultar BCV.
 * Si está en 'AUTO', retorna la tasa oficial más reciente (incluyendo la del día siguiente si ya salió).
 */
export async function getTasaBcvAction() {
  noStore();
  const supabase = await createClient();

  try {
    let isEur = false;
    let tipoTasa = 'AUTO';
    let tasaManual = 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
      if (profile) {
        const { data: emp } = await supabase
          .from('empresas')
          .select('moneda_referencia, tipo_tasa, tasa_manual')
          .eq('id', profile.empresa_id)
          .single();

        if (emp) {
          if (emp.moneda_referencia === 'EUR') isEur = true;
          tipoTasa = emp.tipo_tasa || 'AUTO';
          tasaManual = Number(emp.tasa_manual) || 0;
        }
      }
    }

    // SI LA EMPRESA ESTÁ EN MODO MANUAL Y TIENE TASA CONFIGURADA:
    if (tipoTasa === 'MANUAL' && tasaManual > 0) {
      return { 
        tasa: tasaManual, 
        fecha: 'Manual', 
        tipoTasa: 'MANUAL', 
        tasaManual, 
        moneda: isEur ? 'EUR' : 'USD',
        isNextDay: false 
      };
    }

    // SI ESTÁ EN MODO AUTO (BCV):
    const { data } = await supabase
      .from('tasa_cambiaria')
      .select('tasa_bcv, tasa_eur, fecha')
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());

    // Si no hay tasa o es más antigua que hoy, intentar sincronizar
    if (!data || data.fecha < today) {
      try {
        const syncRes = await syncBcvDirectAction();
        if (syncRes.success && syncRes.usdRate) {
          const freshRate = isEur ? syncRes.eurRate : syncRes.usdRate;
          return { 
            tasa: freshRate, 
            fecha: syncRes.fecha, 
            tipoTasa: 'AUTO', 
            tasaManual, 
            moneda: isEur ? 'EUR' : 'USD',
            isNextDay: syncRes.isNextDay 
          };
        }
      } catch (syncErr) {
        console.warn('Auto-sync fallback error in getTasaBcvAction:', syncErr);
      }
    }

    if (!data) return { tasa: 804.81, fecha: null, tipoTasa: 'AUTO', tasaManual, moneda: isEur ? 'EUR' : 'USD', isNextDay: false };

    const selectedRate = isEur ? (Number(data.tasa_eur) || Number(data.tasa_bcv)) : Number(data.tasa_bcv);
    return { 
      tasa: selectedRate, 
      fecha: data.fecha, 
      tipoTasa: 'AUTO', 
      tasaManual, 
      moneda: isEur ? 'EUR' : 'USD',
      isNextDay: data.fecha > today
    };
  } catch (err) {
    return { tasa: 804.81, fecha: null, tipoTasa: 'AUTO', tasaManual: 0, moneda: 'USD', isNextDay: false };
  }
}

/**
 * Obtiene el detalle completo de configuración de tasa para la pantalla de Ajustes.
 */
export async function getEmpresaConfigTasaAction() {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const { data: emp } = await supabase
    .from('empresas')
    .select('id, moneda_referencia, tipo_tasa, tasa_manual')
    .eq('id', profile.empresa_id)
    .single();

  const { data: tasaOficial } = await supabase
    .from('tasa_cambiaria')
    .select('tasa_bcv, tasa_eur, fecha, created_at')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());

  const isEur = emp?.moneda_referencia === 'EUR';
  const tipoTasa = emp?.tipo_tasa || 'AUTO';
  const tasaManual = Number(emp?.tasa_manual) || 0;
  const bcvUsd = Number(tasaOficial?.tasa_bcv) || 814.69;
  const bcvEur = Number(tasaOficial?.tasa_eur) || 947.30;
  const fechaTasa = tasaOficial?.fecha || today;
  const isNextDay = fechaTasa > today;

  return {
    success: true,
    tipoTasa,
    tasaManual,
    monedaReferencia: (emp?.moneda_referencia || 'USD') as 'USD' | 'EUR',
    bcvUsd,
    bcvEur,
    tasaActiva: tipoTasa === 'MANUAL' && tasaManual > 0 ? tasaManual : (isEur ? bcvEur : bcvUsd),
    fechaTasa,
    isNextDay,
    ultimaActualizacion: tasaOficial?.created_at
  };
}

/**
 * Actualiza la configuración de tasa de la empresa (Modo AUTO o MANUAL, y el valor manual).
 */
export async function updateEmpresaConfigTasaAction({
  tipo_tasa,
  tasa_manual
}: {
  tipo_tasa: 'AUTO' | 'MANUAL';
  tasa_manual?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Perfil no encontrado' };

  const updateData: any = { tipo_tasa };
  if (tasa_manual !== undefined) {
    updateData.tasa_manual = tasa_manual;
  }

  const { error } = await supabase
    .from('empresas')
    .update(updateData)
    .eq('id', profile.empresa_id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/configuracion');
  return { success: true };
}

export async function updateTasaBcvAction(nuevaTasa: number, isEur: boolean = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());
    
    const { data: actual } = await supabase.from('tasa_cambiaria').select('tasa_bcv, tasa_eur').eq('fecha', today).maybeSingle();
    
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
  revalidatePath('/dashboard/configuracion');
  return { success: true };
}
