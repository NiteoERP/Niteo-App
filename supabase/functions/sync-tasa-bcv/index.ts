import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  try {
    // 1. Fetch from dolarapi.com
    console.log("Fetching BCV rate...");
    const response = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
    
    if (!response.ok) {
      throw new Error(`API response error: ${response.status}`);
    }
    
    const data = await response.json();
    const rate = parseFloat(data.promedio);
    
    if (isNaN(rate) || rate <= 0) {
      throw new Error("Invalid rate received from API");
    }

    console.log(`Current BCV Rate fetched: ${rate}`);

    // 2. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase env variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Upsert the rate for today
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('tasa_cambiaria')
      .upsert({ fecha: today, tasa_bcv: rate }, { onConflict: 'fecha' });
      
    if (error) {
      throw error;
    }

    console.log(`Successfully saved BCV rate: ${rate} for date: ${today}`);

    return new Response(
      JSON.stringify({ success: true, rate, date: today }),
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
