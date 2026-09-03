import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  try {
    console.log("Fetching BCV rates (USD and EUR)...");
    
    // 1. Fetch USD
    const usdResponse = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
    if (!usdResponse.ok) throw new Error(`USD API error: ${usdResponse.status}`);
    const usdData = await usdResponse.json();
    const usdRate = parseFloat(usdData.promedio);
    
    // 2. Fetch EUR
    const eurResponse = await fetch("https://ve.dolarapi.com/v1/euros");
    let eurRate = usdRate; // fallback if euro fails
    if (eurResponse.ok) {
        const eurData = await eurResponse.json();
        eurRate = parseFloat(eurData.promedio);
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

    // 4. Upsert the rates for today
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('tasa_cambiaria')
      .upsert({ fecha: today, tasa_bcv: usdRate, tasa_eur: eurRate }, { onConflict: 'fecha' });
      
    if (error) throw error;

    console.log(`Successfully saved rates for date: ${today}`);

    return new Response(
      JSON.stringify({ success: true, usdRate, eurRate, date: today }),
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
