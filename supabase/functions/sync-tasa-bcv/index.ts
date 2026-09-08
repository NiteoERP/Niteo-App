import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

async function fetchBCVDirect() {
  try {
    console.log("Intentando scraping directo de https://www.bcv.org.ve ...");
    const res = await fetch("https://www.bcv.org.ve", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      }
    });
    if (!res.ok) {
      console.warn("BCV directo respondió con status:", res.status);
      return null;
    }
    const html = await res.text();
    
    // Parsear USD: <span> USD</span> ... <strong class="strong-tb">820,10180000</strong>
    const usdMatch = html.match(/<span>\s*USD\s*<\/span>[\s\S]*?<strong[^>]*>\s*([0-9.,]+)\s*<\/strong>/i);
    // Parsear EUR: <span> EUR </span> ... <strong class="strong-tb"> 954,02442394</strong>
    const eurMatch = html.match(/<span>\s*EUR\s*<\/span>[\s\S]*?<strong[^>]*>\s*([0-9.,]+)\s*<\/strong>/i);
    // Parsear Fecha Valor (ej: content="2026-09-09T00:00:00-04:00")
    const dateMatch = html.match(/content="([0-9]{4}-[0-9]{2}-[0-9]{2})/i);

    if (usdMatch && usdMatch[1]) {
      const usdClean = usdMatch[1].trim().replace(/\./g, '').replace(',', '.');
      const usdRate = parseFloat(usdClean);

      let eurRate = usdRate;
      if (eurMatch && eurMatch[1]) {
        const eurClean = eurMatch[1].trim().replace(/\./g, '').replace(',', '.');
        eurRate = parseFloat(eurClean);
      }

      const effectiveDate = dateMatch ? dateMatch[1] : null;
      console.log(`BCV directo exitoso - USD: ${usdRate}, EUR: ${eurRate}, Fecha Valor: ${effectiveDate}`);
      return { usdRate, eurRate, effectiveDate };
    }
  } catch (e: any) {
    console.warn("Error en scraping directo de BCV:", e.message);
  }
  return null;
}

serve(async (req) => {
  try {
    console.log("Fetching BCV rates (USD and EUR)...");
    
    let usdRate = 0;
    let eurRate = 0;
    let effectiveDate: string | null = null;

    // 1. Intentar primero directamente desde la web oficial del BCV (incluye Fecha Valor del día siguiente)
    const directData = await fetchBCVDirect();
    if (directData && directData.usdRate > 0) {
      usdRate = directData.usdRate;
      eurRate = directData.eurRate;
      effectiveDate = directData.effectiveDate;
    } else {
      console.log("Fallback: Obteniendo tasas desde DolarApi...");
      // Fallback 1: Fetch USD desde DolarApi
      const usdResponse = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      if (!usdResponse.ok) throw new Error(`USD API error: ${usdResponse.status}`);
      const usdData = await usdResponse.json();
      usdRate = parseFloat(usdData.promedio);
      
      // Fallback 2: Fetch EUR desde DolarApi
      const eurResponse = await fetch("https://ve.dolarapi.com/v1/euros");
      eurRate = usdRate; // fallback
      if (eurResponse.ok) {
          const eurData = await eurResponse.json();
          const oficialEur = Array.isArray(eurData) ? eurData.find((e: any) => e.fuente === 'oficial') : eurData;
          if (oficialEur && oficialEur.promedio) {
             eurRate = parseFloat(oficialEur.promedio);
          }
      }
    }
    
    if (isNaN(usdRate) || usdRate <= 0) {
      throw new Error("Invalid rate received from API");
    }

    console.log(`Rates fetched - USD: ${usdRate}, EUR: ${eurRate}`);

    // 3. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase env variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Upsert the rates for target date (si el BCV ya publicó la Fecha Valor de mañana, usar esa fecha)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());
    const targetDate = (effectiveDate && effectiveDate >= today) ? effectiveDate : today;
    
    const { error } = await supabase
      .from('tasa_cambiaria')
      .upsert({ fecha: targetDate, tasa_bcv: usdRate, tasa_eur: eurRate }, { onConflict: 'fecha' });
      
    if (error) throw error;

    console.log(`Successfully saved rates for date: ${targetDate} (Today: ${today}, Effective: ${effectiveDate})`);

    return new Response(
      JSON.stringify({ success: true, usdRate, eurRate, date: targetDate, isNextDay: targetDate > today }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error syncing BCV rate:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    )
  }
})
