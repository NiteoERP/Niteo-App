require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRegistrar() {
  const p_insumo_id = 'e9259b38-1bc7-49ab-aa87-be6d992a945e';
  const p_usuario_id = 'b9ce9fba-3714-41d3-883a-cdbc3a2d3345'; // dummy or let's get a real one
  
  const { data: user } = await supabase.from('perfiles').select('id').limit(1).single();
  
  const { error: movErr } = await supabase.from('movimientos_inventario').insert({
    empresa_id: '818d1555-e879-4f1d-8bed-39eb466aa5e3',
    insumo_id: p_insumo_id,
    usuario_id: user.id,
    tipo_movimiento: 'ENTRADA',
    cantidad: 10,
    costo_perdido: 0,
    motivo: 'AJUSTE_INVENTARIO'
  });

  console.log("Insert mov error:", movErr);
}
testRegistrar();
