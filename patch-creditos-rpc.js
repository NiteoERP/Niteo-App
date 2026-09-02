const fs = require('fs');

let code = fs.readFileSync('src/actions/creditos-actions.ts', 'utf-8');

// Replace registrarAbono
const regAbono = /export async function registrarAbono\(facturaId: string, montoAbonado: number, metodoPago: string, fechaPago\?: string, referencia\?: string\) \{[\s\S]*?return \{ success: true \};\s*\}/s;

const newAbono = `export async function registrarAbono(facturaId: string, montoAbonado: number, metodoPago: string, fechaPago?: string, referencia?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data, error } = await supabase.rpc('registrar_abono_factura', {
    p_factura_id: facturaId,
    p_monto: montoAbonado,
    p_metodo_pago: metodoPago,
    p_fecha_pago: fechaPago || null,
    p_usuario_id: user.id
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}`;

code = code.replace(regAbono, newAbono);


// Replace registrarAbonoGlobal
const regGlobal = /export async function registrarAbonoGlobal\(clienteId: string, sedeId: string, monto: number, metodoPago: string, fechaPago\?: string, referencia\?: string\) \{[\s\S]*?return \{ success: true, restante: montoRestante, facturasPagadas: abonosRegistrados \};\s*\}/s;

const newGlobal = `export async function registrarAbonoGlobal(clienteId: string, sedeId: string, monto: number, metodoPago: string, fechaPago?: string, referencia?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const p_sede_id = sedeId === 'ALL' ? null : sedeId;

  const { data, error } = await supabase.rpc('registrar_abono_global', {
    p_cliente_id: clienteId,
    p_sede_id: p_sede_id,
    p_monto: monto,
    p_metodo_pago: metodoPago,
    p_fecha_pago: fechaPago || null,
    p_usuario_id: user.id
  });

  if (error) return { success: false, error: error.message };
  return { 
    success: true, 
    restante: data?.restante, 
    facturasPagadas: data?.facturasPagadas 
  };
}`;

code = code.replace(regGlobal, newGlobal);

fs.writeFileSync('src/actions/creditos-actions.ts', code);
