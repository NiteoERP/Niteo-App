const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

const effectStart = "  useEffect(() => {\n    async function loadInitial() {";
const effectStart2 = "  useEffect(() => {\r\n    async function loadInitial() {";

let idx1 = code.indexOf(effectStart);
if (idx1 === -1) idx1 = code.indexOf(effectStart2);

// find where handleSedeChange ends
const endMarker = "setLoading(false);\n  };";
const endMarker2 = "setLoading(false);\r\n  };";

let idx2 = code.indexOf(endMarker, idx1);
let matchLen = endMarker.length;
if (idx2 === -1) {
  idx2 = code.indexOf(endMarker2, idx1);
  matchLen = endMarker2.length;
}

if (idx1 !== -1 && idx2 !== -1) {
  const newBlock = `  useEffect(() => {
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
  }, [cierreId, router]);

  const handleSedeChange = async (newSedeId: string) => {
    // NO-OP in Edit mode
  };`;

  code = code.slice(0, idx1) + newBlock + code.slice(idx2 + matchLen);
}

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
