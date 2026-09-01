const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

// Replace standard actions with edit actions
code = code.replace(
  /import \{ getCierrePrevio, guardarCierre, getBancosUtilizados \} from '@\/actions\/cierres-actions';/,
  `import { getCierrePrevio, actualizarCierre, getBancosUtilizados } from '@/actions/cierres-actions';\nimport { createClient } from '@/utils/supabase/client';`
);

// Rename component and add props
code = code.replace(
  /export default function NuevoCierreCaja\(\) \{/,
  `export default function EditarCierrePage({ params }: { params: { id: string } }) { // not async because it's use client`
);

// We need to unwrap params correctly in client component (React 19 style).
// Since it's a client component, we use React.use() if needed, but since we're just hacking it together for the beta,
// we can use useParams() from next/navigation
code = code.replace(
  /import \{ useRouter \} from 'next\/navigation';/,
  `import { useRouter, useParams } from 'next/navigation';`
);

code = code.replace(
  /export default function EditarCierrePage[\s\S]*?const router = useRouter\(\);/,
  `export default function EditarCierrePage() {
  const router = useRouter();
  const params = useParams();
  const cierreId = params.id as string;
  const supabase = createClient();`
);

// Remove draft logic
code = code.replace(/\/\/ --- DRAFT LOGIC ---[\s\S]*?\/\/ -------------------/, '');
code = code.replace(/const \[hasDraft, setHasDraft\] = useState\(false\);/, '');

// Load initial data
code = code.replace(
  /const sedesData = await getSedes\(\);\n[\s\S]*?setBancosSugeridos\(bancosRes\);/m,
  `// Fetch the existing closure
        const { data: cierre } = await supabase.from('cierres_caja').select('*').eq('id', cierreId).single();
        if (!cierre) throw new Error("Cierre no encontrado");

        const sedesData = await getSedes();
        setSedes(sedesData);
        setSelectedSedeId(cierre.sede_id);
        
        setTasaCambio(cierre.tasa_cambio || 36.5);
        setVentasTotales(cierre.sistema_ventas_brutas || 0);
        setGastosTotales(cierre.sistema_gastos_operativos || 0);
        setTotalEsperado(cierre.sistema_total_esperado || 0);

        const bancosRes = await getBancosUtilizados();
        setBancosSugeridos(bancosRes);

        // Fetch existing transactions
        const { data: txs } = await supabase.from('cierres_transacciones').select('*').eq('cierre_id', cierreId);
        if (txs && txs.length > 0) {
          setTransacciones(txs.map(t => ({
            id: t.id || Math.random().toString(),
            metodo: t.metodo,
            banco: t.banco === 'N/A' ? '' : t.banco,
            referencia: t.referencia === 'N/A' ? '' : t.referencia,
            monto: t.monto.toString(),
            moneda: t.moneda
          })));
        }`
);

// Update Save handler
code = code.replace(
  /const res = await guardarCierre\(cierreData, transaccionesCleaned\);/,
  `const res = await actualizarCierre(cierreId, cierreData, transaccionesCleaned);`
);

// Adjust success navigation
code = code.replace(
  /alert\('Cierre guardado correctamente!'\);\n\s*router\.push\('\/dashboard\/caja'\);/,
  `alert('Cierre actualizado correctamente!');
          router.push(\`/dashboard/caja/\${cierreId}\`);`
);

// Remove CierreEnCursoBanner
code = code.replace(/\{hasDraft && \([\s\S]*?\}\)\}/, '');

// Disable Sede select (it shouldn't be changeable on edit)
code = code.replace(
  /<select\n\s*value=\{selectedSedeId\}/,
  `<select disabled\nvalue={selectedSedeId}`
);

// Change titles
code = code.replace(/<h1 className="text-3xl font-bold text-white tracking-tight">Nuevo Cierre<\/h1>/, `<h1 className="text-3xl font-bold text-white tracking-tight">Editar Cierre</h1>`);
code = code.replace(/<p className="text-neutral-400 mt-1">Registra los montos físicos.*?<\/p>/, `<p className="text-neutral-400 mt-1">Modifica los montos registrados en este cierre.</p>`);
code = code.replace(/<span className="hidden sm:inline">Guardar Cierre<\/span>/, `<span className="hidden sm:inline">Actualizar Cierre</span>`);

// Remove handleSedeChange loadDraft
code = code.replace(/loadDraft\(newSedeId\);/g, '');

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
