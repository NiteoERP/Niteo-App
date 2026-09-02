const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/proveedores/actions.ts', 'utf-8');

const regex = /export async function registrarPagoProveedor\(facturaId: string, monto: number, metodoPago: string, referencia: string, bancoOrigen: string\) \{[\s\S]*?\}\)/s;

const replacement = `export async function registrarPagoProveedor(facturaId: string, monto: number, metodoPago: string, referencia: string, bancoOrigen: string, fechaPago?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };
  
    const payload: any = {
      factura_id: facturaId,
      monto,
      metodo_pago: metodoPago,
      referencia,
      banco_origen: bancoOrigen,
      usuario_id: user.id
    };
    if (fechaPago) {
      payload.created_at = fechaPago;
    }

    const { error } = await supabase.from('compras_pagos').insert(payload)`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/proveedores/actions.ts', code);
