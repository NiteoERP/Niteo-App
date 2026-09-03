const fs = require('fs');
let code = fs.readFileSync('src/actions/creditos-actions.ts', 'utf-8');

const regex = /const \{ error: rpcErr \} = await supabase\.rpc\('registrar_abono_factura', \{[\s\S]*?p_metodo_pago: metodoPago\s*\}\);[\s\S]*?return \{ success: false, error: rpcErr\.message \};\s*\}/;

const replacement = `
    const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();

    const { error: insertError } = await supabase.from('ventas_pagos').insert({
      empresa_id: profile?.empresa_id,
      factura_id: fac.id,
      id_pos: 'WEB_' + Date.now().toString(),
      tipo_pago: metodoPago,
      monto: montoAbonar,
      fecha_pago: new Date().toISOString()
    });

    if (insertError) {
      console.error(insertError);
      return { success: false, error: insertError.message };
    }

    const nuevoSaldo = Math.max(0, fac.saldo_pendiente - montoAbonar);
    const nuevoEstado = nuevoSaldo > 0 ? 2 : 1;

    const { error: updateError } = await supabase
      .from('ventas_facturas')
      .update({ saldo_pendiente: nuevoSaldo, estado_pago: nuevoEstado })
      .eq('id', fac.id);

    if (updateError) {
      console.error(updateError);
      return { success: false, error: updateError.message };
    }
`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/actions/creditos-actions.ts', code);
