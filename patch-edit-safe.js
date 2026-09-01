const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

// Replace actions
code = code.replace(
  /import \{ getCierrePrevio, guardarCierre, getBancosUtilizados \} from '@\/actions\/cierres-actions';/,
  `import { getCierrePrevio, actualizarCierre, getBancosUtilizados } from '@/actions/cierres-actions';\nimport { createClient } from '@/utils/supabase/client';`
);

// Rename component and add props
code = code.replace(
  /export default function NuevoCierreCaja\(\) \{/,
  `export default function EditarCierrePage({ params }: { params: { id: string } }) {`
);

code = code.replace(
  /import \{ useRouter \} from 'next\/navigation';/,
  `import { useRouter, useParams } from 'next/navigation';`
);

code = code.replace(
  /const router = useRouter\(\);/,
  `const router = useRouter();\n  const routerParams = useParams();\n  const cierreId = routerParams.id as string;\n  const supabase = createClient();`
);

// We need to inject the fetch logic into the existing loadInitial
code = code.replace(
  /const sedesData = await getSedes\(\);\n\s*setSedes\(sedesData\);[\s\S]*?if \(cierreRes\.targetSedeId\)/,
  `const sedesData = await getSedes();
        setSedes(sedesData);
        
        // Fetch existing closure
        const { data: cierre } = await supabase.from('cierres_caja').select('*').eq('id', cierreId).single();
        if (!cierre) throw new Error("Cierre no encontrado");

        const initialSedeId = cierre.sede_id;
        
        const [bancosRes] = await Promise.all([
          getBancosUtilizados()
        ]);
        
        if (initialSedeId)`
);

code = code.replace(
  /setTasaCambio\(cierreRes\.tasaCambio \|\| 36\.5\);\n\s*setVentasTotales\(cierreRes\.ventasTotales \|\| 0\);\n\s*setGastosTotales\(cierreRes\.gastosTotales \|\| 0\);\n\s*setTotalEsperado\(cierreRes\.totalEsperado \|\| 0\);/,
  `setTasaCambio(cierre.tasa_cambio || 36.5);
        setVentasTotales(cierre.sistema_ventas_brutas || 0);
        setGastosTotales(cierre.sistema_gastos_operativos || 0);
        setTotalEsperado(cierre.sistema_total_esperado || 0);

        // Fetch txs
        const { data: txs } = await supabase.from('cierres_transacciones').select('*').eq('cierre_id', cierreId);
        if (txs && txs.length > 0) {
          setTransacciones(txs.map(t => ({
            id: Math.random().toString(36).substr(2, 9),
            metodo: t.metodo,
            banco: t.banco === 'N/A' ? '' : t.banco,
            referencia: t.referencia === 'N/A' ? '' : t.referencia,
            monto: t.monto.toString(),
            moneda: t.moneda
          })));
        } else {
           setTransacciones([]);
        }`
);

// We don't want Draft logic to override our loaded transactions
// Remove draft logic
code = code.replace(/\/\/ --- DRAFT LOGIC ---[\s\S]*?\/\/ -------------------/m, '');
code = code.replace(/loadDraft\(finalSede\);/g, '');

// Save logic
code = code.replace(
  /const res = await guardarCierre\(cierreData, transaccionesCleaned\);/,
  `const res = await actualizarCierre(cierreId, cierreData, transaccionesCleaned);`
);

code = code.replace(
  /alert\('Cierre guardado correctamente!'\);\n\s*router\.push\('\/dashboard\/caja'\);/,
  `alert('Cierre actualizado correctamente!');
          router.push(\`/dashboard/caja/\${cierreId}\`);`
);

// UI adjustments
code = code.replace(/<h1 className="text-3xl font-bold text-white tracking-tight">Nuevo Cierre<\/h1>/, `<h1 className="text-3xl font-bold text-white tracking-tight">Editar Cierre</h1>`);
code = code.replace(/<p className="text-neutral-400 mt-1">Registra los montos físicos.*?<\/p>/, `<p className="text-neutral-400 mt-1">Modifica los montos registrados en este cierre.</p>`);
code = code.replace(/<span className="hidden sm:inline">Guardar Cierre<\/span>/, `<span className="hidden sm:inline">Actualizar Cierre</span>`);

// Banner removal using string slice (safely)
const bannerStart = code.indexOf('{/* FIX 1: BANNER DE BORRADOR ACTIVO */}');
if (bannerStart !== -1) {
  const bannerEnd = code.indexOf(')}', bannerStart) + 2;
  code = code.substring(0, bannerStart) + code.substring(bannerEnd);
}

// Disable sede select
code = code.replace(
  /<select\n\s*value=\{selectedSedeId\}/,
  `<select disabled\n                    value={selectedSedeId}`
);

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
