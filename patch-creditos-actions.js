const fs = require('fs');
let code = fs.readFileSync('src/actions/creditos-actions.ts', 'utf-8');

// registrarAbono
const regex1 = /export async function registrarAbono\(facturaId: string, montoAbonado: number, metodoPago: string\) \{[\s\S]*?const \{ error \} = await supabase\.from\('ventas_pagos'\)\.insert\(\{[\s\S]*?\}\);/s;

const repl1 = `export async function registrarAbono(facturaId: string, montoAbonado: number, metodoPago: string, fechaPago?: string, referencia?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: "Perfil no encontrado" };

  const payload: any = {
    factura_id: facturaId,
    monto: montoAbonado,
    metodo_pago: metodoPago,
    empresa_id: profile.empresa_id,
    cajero_id: user.id
  };
  if (fechaPago) payload.created_at = fechaPago;
  if (referencia) payload.referencia = referencia;

  const { error } = await supabase.from('ventas_pagos').insert(payload);`;

code = code.replace(regex1, repl1);

// registrarAbonoGlobal
const regex2 = /export async function registrarAbonoGlobal\(clienteId: string, sedeId: string, monto: number, metodoPago: string\) \{/s;

const repl2 = `export async function registrarAbonoGlobal(clienteId: string, sedeId: string, monto: number, metodoPago: string, fechaPago?: string, referencia?: string) {`;

code = code.replace(regex2, repl2);

const regex3 = /const \{ error \} = await supabase\.from\('ventas_pagos'\)\.insert\(\{[\s\S]*?cajero_id: user\.id\s*\}\);/g;

const repl3 = `const payload: any = {
      factura_id: fac.id,
      monto: montoAbonar,
      metodo_pago: metodoPago,
      empresa_id: fac.empresa_id,
      cajero_id: user.id
    };
    if (fechaPago) payload.created_at = fechaPago;
    if (referencia) payload.referencia = referencia;
    const { error } = await supabase.from('ventas_pagos').insert(payload);`;

code = code.replace(regex3, repl3);

fs.writeFileSync('src/actions/creditos-actions.ts', code);
