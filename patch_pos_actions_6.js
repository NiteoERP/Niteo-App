const fs = require('fs');
let code = fs.readFileSync('src/actions/pos-actions.ts', 'utf8');

// 1. Update interfaces
code = code.replace(
  "export interface VentaPOS {",
  "export interface VentaPOS {\n  verificado?: boolean;"
);
code = code.replace(
  "export interface HistorialVentaPOS {",
  "export interface HistorialVentaPOS {\n  verificado?: boolean;"
);

// 2. Add toggle function at the end
code += `\n
export async function toggleVentaVerificada(facturaId: string, verificado: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('ventas_facturas')
    .update({ verificado })
    .eq('id', facturaId);
  
  if (error) {
    console.error('Error toggling verificado:', error);
    return { success: false, error };
  }
  return { success: true };
}
`;

fs.writeFileSync('src/actions/pos-actions.ts', code, 'utf8');
