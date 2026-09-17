import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { req_master_key } = await req.json();

    if (!req_master_key) {
      return new Response(JSON.stringify({ error: 'Master Key requerida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: sede, error: sedeError } = await supabaseAdmin
      .from('sedes')
      .select('id, empresa_id')
      .eq('master_key', req_master_key)
      .single();

    if (sedeError || !sede) {
      return new Response(JSON.stringify({ error: 'Sede no encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // AHORA FILTRAMOS POR SEDE_ID
    const { data: productos } = await supabaseAdmin
      .from('productos')
      .select('id, categoria_id, nombre, codigo_barras, precio_venta, costo, precio_modificable, estado_activo')
      .or(`sede_id.eq.${sede.id},sede_id.is.null`) // Si es nulo es global temporalmente
      .eq('empresa_id', sede.empresa_id);

    const { data: metodos } = await supabaseAdmin
      .from('compras_metodos_pago')
      .select('id, nombre, estado_activo')
      .or(`sede_id.eq.${sede.id},sede_id.is.null`)
      .eq('empresa_id', sede.empresa_id);

    const { data: tasa } = await supabaseAdmin
      .from('tasa_cambiaria')
      .select('tasa_bcv')
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    return new Response(JSON.stringify({
      productos: productos || [],
      metodos_pago: metodos || [],
      tasa_bcv: tasa?.tasa_bcv || 1
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
