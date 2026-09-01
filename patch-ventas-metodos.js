const fs = require('fs');
let code = fs.readFileSync('src/actions/informes-actions.ts', 'utf-8');

// I need to intercept `ventas_metodos_pago` and execute `getResumenPagos` logic, OR just query closures.
// Wait, I can just import `getResumenPagos` from `cierres-actions.ts` inside `informes-actions.ts`!

if (!code.includes("import { getResumenPagos }")) {
  code = "import { getResumenPagos } from './cierres-actions';\n" + code;
}

// Now replace the ventas_metodos_pago case to not set rpcName, but instead return early with the custom logic.
const oldCase = `    case 'ventas_metodos_pago':
      rpcName   = 'get_reporte_metodos_pago';
      rpcParams = { p_empresa_id, p_sede_id, p_fecha_inicio, p_fecha_fin };
      break;`;

const newCase = `    case 'ventas_metodos_pago':
      // Usar la lógica de Resumen de Pagos en JS (pivoteado por día) para evitar errores del RPC
      const resumenReq = await getResumenPagos(
        p_fecha_inicio.split('T')[0],
        p_fecha_fin.split('T')[0],
        p_sede_id || 'ALL'
      );
      if (resumenReq.error || !resumenReq.data) {
        return { success: false, error: resumenReq.error || 'Error cargando ingresos por método' };
      }
      
      // Formatear los datos para la tabla de informes
      const formattedData = resumenReq.data.map(row => {
        const obj: any = { Fecha: row.fecha, 'Total (USD)': row.total_usd };
        Object.entries(row.metodos).forEach(([m, v]) => {
          obj[m] = v;
        });
        return obj;
      });
      return { success: true, data: formattedData.length > 0 ? formattedData : [] };`;

code = code.replace(oldCase, newCase);

fs.writeFileSync('src/actions/informes-actions.ts', code);
