const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

const loadInitStart = "useEffect(() => {";
const loadInitEnd = "loadInitial();\n  }, []);";
const loadInitEnd2 = "loadInitial();\r\n  }, []);";

let idx1 = code.indexOf(loadInitStart);
let idx2 = code.indexOf(loadInitEnd, idx1);
let matchLen = loadInitEnd.length;

if (idx2 === -1) {
  idx2 = code.indexOf(loadInitEnd2, idx1);
  matchLen = loadInitEnd2.length;
}

if (idx1 !== -1 && idx2 !== -1) {
  const newUseEffect = `useEffect(() => {
    async function loadInitial() {
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
    }
    loadInitial();
  }, [cierreId, router]);`;
  
  code = code.slice(0, idx1) + newUseEffect + code.slice(idx2 + matchLen);
}

const handleStart = "const handleSedeChange = async (newSedeId: string) => {";
const handleEnd = "setLoading(false);\n  };";
const handleEnd2 = "setLoading(false);\r\n  };";

let hIdx1 = code.indexOf(handleStart);
let hIdx2 = code.indexOf(handleEnd, hIdx1);
let hMatchLen = handleEnd.length;

// Note the original might have had different indentation.
// Let's just find the next "const saveDraft" or "const updateTransaccion"
const updateTxStart = "const updateTransaccion";
let hEndFixed = code.indexOf(updateTxStart, hIdx1);
if (hIdx1 !== -1 && hEndFixed !== -1) {
  const newHandle = `const handleSedeChange = async (newSedeId: string) => {
    // No permitimos cambiar la sede en edición
  };

  `;
  code = code.slice(0, hIdx1) + newHandle + code.slice(hEndFixed);
}

// Ensure the select is disabled
code = code.replace(
  /<select\s+value=\{selectedSedeId\}\s+onChange=\{\(e\) => handleSedeChange\(e\.target\.value\)\}/g,
  '<select\n                value={selectedSedeId}\n                disabled\n                onChange={(e) => handleSedeChange(e.target.value)}'
);

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
