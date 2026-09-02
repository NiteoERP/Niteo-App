const fs = require('fs');
let code = fs.readFileSync('src/actions/creditos-actions.ts', 'utf-8');

// Fix the payload for ventas_pagos in registrarAbono and registrarAbonoGlobal
code = code.replace(/const payload: any = \{[\s\S]*?cajero_id: user\.id\s*\};\s*if \(fechaPago\) payload\.created_at = fechaPago;\s*if \(referencia\) payload\.referencia = referencia;/g, `const payload: any = {
    factura_id: facturaId || fac?.id,
    monto: montoAbonado || montoAbonar,
    tipo_pago: metodoPago,
    empresa_id: profile?.empresa_id || fac?.empresa_id
  };
  if (fechaPago) payload.fecha_pago = fechaPago;
  // referencia no existe en ventas_pagos, se ignora`);

fs.writeFileSync('src/actions/creditos-actions.ts', code);
