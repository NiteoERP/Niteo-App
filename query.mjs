import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gqlhillifpxizbaqaagl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGhpbGxpZnB4aXpiYXFhYWdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU3OTMyMywiZXhwIjoyMTAyMTU1MzIzfQ.Tifa5ERlUd8wV7x89sBd20FHr_zLYgSn-u_qmrH5wQo'
);

function getTimezoneOffsetString(timezone) {
  return '-04:00'; // mockup
}

async function run() {
  const cierreId = '84430014-3fd2-4dd0-a79d-3425c86f6e41';
  const { data: cierre, error } = await supabase
    .from('cierres_caja')
    .select('*')
    .eq('id', cierreId)
    .single();

  if (error || !cierre) return console.log("Cierre no encontrado");

  try {
      const { data: empData, error: empError } = await supabase
        .from('empresas')
        .select('zona_horaria')
        .eq('id', cierre.empresa_id)
        .maybeSingle();

      if(empError) console.error(empError);

      const timeZone = empData?.zona_horaria || 'America/Caracas';
      const tzOffset = getTimezoneOffsetString(timeZone);

      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas_facturas')
        .select('total, tipo_documento, numero_orden, ventas_pagos (tipo_pago, monto)')
        .eq('estado_activo', true)
        .eq('sede_id', cierre.sede_id)
        .gte('fecha_venta', `${cierre.fecha_cierre}T00:00:00${tzOffset}`)
        .lte('fecha_venta', `${cierre.fecha_cierre}T23:59:59.999${tzOffset}`);

      if (ventasError) console.error(ventasError);

      const esperadoPorMetodo = {};
      const ventasTotales = ventasData ? ventasData.reduce((acc, curr) => acc + Number(curr.total || 0), 0) : 0;
      
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos_sede')
        .select('monto')
        .eq('estado_activo', true)
        .eq('sede_id', cierre.sede_id)
        .gte('fecha_gasto', `${cierre.fecha_cierre}T00:00:00${tzOffset}`)
        .lte('fecha_gasto', `${cierre.fecha_cierre}T23:59:59.999${tzOffset}`);
      
      if(gastosError) console.error(gastosError);

      const gastosTotales = gastosData ? gastosData.reduce((acc, curr) => acc + Number(curr.monto), 0) : 0;
      const totalEsperado = ventasTotales - gastosTotales;

      cierre.sistema_total_esperado = totalEsperado;
      cierre.sistema_ventas_brutas = ventasTotales;
      cierre.sistema_gastos_operativos = gastosTotales;
      cierre.esperadoPorMetodo = esperadoPorMetodo;

      console.log("RECALCULADO:", totalEsperado);
  } catch (e) {
      console.error('Error recalculando cierre previo para edicion:', e);
  }
}

run();
