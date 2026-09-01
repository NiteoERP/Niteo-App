const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

// Replace loadInitial manually:
const loadInitialBlock = `async function loadInitial() {
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
        if (customMetodos && customMetodos.length > 0) {
          const restoredMetodos = customMetodos.map((mName: string) => ({
            id: mName,
            color: 'border-indigo-500/30',
            defaultMoneda: 'VES' as Moneda,
            isCustom: true,
            iconKey: 'GripHorizontal',
            icon: GripHorizontal
          }));
          
          setMetodos(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newMets = restoredMetodos.filter((r: any) => !existingIds.has(r.id));
            return [...prev, ...newMets];
          });
        }
      } catch (err: any) {
        console.error('Error cargando datos de cierre', err);
        alert(err.message || 'Error cargando datos de cierre');
      } finally {
        setLoading(false);
      }
    }`;

const newLoadInitialBlock = `async function loadInitial() {
      try {
        const sedesData = await getSedes();
        setSedes(sedesData);
        
        const [editData, bancosRes] = await Promise.all([
          import('@/actions/cierres-actions').then(m => m.getCierreParaEditar(cierreId)),
          import('@/actions/cierres-actions').then(m => m.getBancosUtilizados())
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
        
        const customMetodos = await import('@/actions/cierres-actions').then(m => m.getMetodosHistorialSede(editData.cierre.sede_id));
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

code = code.replace(loadInitialBlock, newLoadInitialBlock);
if (!code.includes("router.push('/dashboard/caja');")) {
  console.log("FAILED to replace loadInitialBlock");
}

// Disable handleSedeChange
const handleSedeStart = "const handleSedeChange = async (newSedeId: string) => {";
const handleSedeEnd = "    } catch (err) {\n      console.error(err);\n    }\n    setLoading(false);\n  };";
const handleSedeEnd2 = "    } catch (err) {\r\n      console.error(err);\r\n    }\r\n    setLoading(false);\r\n  };";

const idx1 = code.indexOf(handleSedeStart);
let idx2 = code.indexOf(handleSedeEnd, idx1);
let matchLen = handleSedeEnd.length;
if (idx2 === -1) {
  idx2 = code.indexOf(handleSedeEnd2, idx1);
  matchLen = handleSedeEnd2.length;
}

if (idx1 !== -1 && idx2 !== -1) {
  code = code.slice(0, idx1) + "const handleSedeChange = async (newSedeId: string) => { /* NO-OP in Edit */ };" + code.slice(idx2 + matchLen);
} else {
  console.log("FAILED to replace handleSedeChange");
}

code = code.replace(
  /<select\n                  value=\{selectedSedeId\}\n                  onChange=\{\(e\) => handleSedeChange\(e\.target\.value\)\}/g,
  '<select\n                  value={selectedSedeId}\n                  disabled\n                  onChange={(e) => handleSedeChange(e.target.value)}'
);

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
