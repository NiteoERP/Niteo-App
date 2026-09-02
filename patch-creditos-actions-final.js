const fs = require('fs');
let code = fs.readFileSync('src/actions/creditos-actions.ts', 'utf-8');

const regex1 = /export async function registrarAbono\(facturaId: string, montoAbonado: number, metodoPago: string\) \{[\s\S]*?fecha_pago: new Date\(\)\.toISOString\(\)\s*\}\);/s;

const repl1 = `export async function registrarAbono(facturaId: string, montoAbonado: number, metodoPago: string, fechaPago?: string, referencia?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: "Perfil no encontrado" };

  // Insertar el pago
  const { error: insertError } = await supabase.from('ventas_pagos').insert({
    empresa_id: profile.empresa_id,
    factura_id: facturaId,
    id_pos: 'WEB_' + Date.now().toString(),
    tipo_pago: metodoPago,
    monto: montoAbonado,
    fecha_pago: fechaPago || new Date().toISOString()
  });`;

code = code.replace(regex1, repl1);

const regex2 = /export async function registrarAbonoGlobal\(clienteId: string, sedeId: string, monto: number, metodoPago: string, fechaPago\?: string, referencia\?: string\) \{[\s\S]*?fecha_pago: new Date\(\)\.toISOString\(\)\s*\}\);/g;

const repl2 = `export async function registrarAbonoGlobal(clienteId: string, sedeId: string, monto: number, metodoPago: string, fechaPago?: string, referencia?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  let query = supabase.from('ventas_facturas')
    .select('id, saldo_pendiente, empresa_id')
    .eq('cliente_id', clienteId)
    .gt('saldo_pendiente', 0)
    .order('fecha_venta', { ascending: true });

  if (sedeId !== 'ALL') {
    query = query.eq('sede_id', sedeId);
  }

  const { data: facturas, error: getError } = await query;
  if (getError) return { success: false, error: getError.message };
  if (!facturas || facturas.length === 0) return { success: false, error: 'No hay facturas con deuda para este cliente' };

  let montoRestante = monto;
  let abonosRegistrados = 0;

  for (const fac of facturas) {
    if (montoRestante <= 0) break;
    
    const montoAbonar = Math.min(Number(fac.saldo_pendiente), montoRestante);
    
    const { data: profile } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();

    const { error: insertError } = await supabase.from('ventas_pagos').insert({
      empresa_id: profile?.empresa_id,
      factura_id: fac.id,
      id_pos: 'WEB_' + Date.now().toString(),
      tipo_pago: metodoPago,
      monto: montoAbonar,
      fecha_pago: fechaPago || new Date().toISOString()
    });`;

// Because the regex2 will replace EVERYTHING from export async function registrarAbonoGlobal to the first ventas_pagos insert inside the loop!
code = code.replace(regex2, repl2);

fs.writeFileSync('src/actions/creditos-actions.ts', code);
