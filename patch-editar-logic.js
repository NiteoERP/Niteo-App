const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

// Add import
code = code.replace(
  /getCierrePrevio, actualizarCierre, getBancosUtilizados, getMetodosHistorialSede/g,
  'getCierreParaEditar, actualizarCierre, getBancosUtilizados, getMetodosHistorialSede'
);

// Replace loadInitial
const oldLoadInitialStr = `async function loadInitial() {
      try {
        const sedesData = await getSedes();
        setSedes(sedesData);
        
        const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const lastSedeId = typeof window !== 'undefined' ? localStorage.getItem('niteo_last_sede') : null;
        let initialSedeId = sedesData.length > 0 ? sedesData[0].id : undefined;
        if (lastSedeId && sedesData.some(s => s.id === lastSedeId)) {
          initialSedeId = lastSedeId;
        }
        
        const [cierreRes, bancosRes, customMetodos] = await Promise.all([
          getCierrePrevio(today, initialSedeId),
          getBancosUtilizados(),
          initialSedeId ? getMetodosHistorialSede(initialSedeId) : Promise.resolve([])
        ]);
        
        if (cierreRes.targetSedeId) setSelectedSedeId(cierreRes.targetSedeId);
        else if (initialSedeId) setSelectedSedeId(initialSedeId);

        setTasaCambio(cierreRes.tasaCambio || 36.5);
        setVentasTotales(cierreRes.ventasTotales || 0);
        setGastosTotales(cierreRes.gastosTotales || 0);
        setTotalEsperado(cierreRes.totalEsperado || 0);
        setBancosPorMetodo(bancosRes);
        setLoading(false);
      }
    }`;

const newLoadInitialStr = `async function loadInitial() {
      try {
        const sedesData = await getSedes();
        setSedes(sedesData);
        
        const [editData, bancosRes] = await Promise.all([
          getCierreParaEditar(cierreId),
          getBancosUtilizados()
        ]);
        
        if (!editData) {
          alert('Cierre no encontrado');
          router.push('/dashboard/caja');
          return;
        }
        
        setSelectedSedeId(editData.cierre.sede_id);
        setTasaCambio(editData.cierre.tasa_cambio || 36.5);
        setVentasTotales(editData.cierre.sistema_ventas_brutas || 0);
        setGastosTotales(editData.cierre.sistema_gastos_operativos || 0);
        setTotalEsperado(editData.cierre.sistema_total_esperado || 0);
        
        if (editData.transacciones.length > 0) {
           setTransacciones(editData.transacciones);
        }
        
        setBancosPorMetodo(bancosRes);
        
        const customMetodos = await getMetodosHistorialSede(editData.cierre.sede_id);
        if (customMetodos && customMetodos.length > 0) {
            const restoredMetodos = customMetodos.map((mName: string) => ({
              id: mName,
              color: 'border-indigo-500/30',
              defaultMoneda: 'VES' as Moneda,
              isCustom: true,
              iconKey: 'GripHorizontal',
              icon: GripHorizontal
            }));
            setMetodos((prev: any[]) => {
              const prevNames = new Set(prev.map(m => m.id));
              const toAdd = restoredMetodos.filter(m => !prevNames.has(m.id));
              return [...prev, ...toAdd];
            });
        }
        
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    }`;

code = code.replace(
  /async function loadInitial\(\) \{[\s\S]*?setLoading\(false\);\n      \}\n    \}/,
  newLoadInitialStr
);

// We need to disable handleSedeChange in Edit page because you can't edit the SEDE of an existing closure!
// The simplest way is to just ignore it or disable the dropdown.
// But let's leave it as is, if they change the Sede, it just keeps the transactions but changes Sede.
// Actually we should just remove handleSedeChange and just setSelectedSedeId.

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
