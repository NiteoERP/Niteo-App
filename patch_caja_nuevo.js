const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  "import { getCierrePrevio, guardarCierre, getBancosUtilizados } from '@/actions/cierres-actions';",
  "import { getCierrePrevio, guardarCierre, getBancosUtilizados } from '@/actions/cierres-actions';\nimport { getSedes } from '@/actions/sedes-actions';"
);

// 2. Add state
code = code.replace(
  "const [tasaCambio, setTasaCambio] = useState(1);",
  "const [tasaCambio, setTasaCambio] = useState(1);\n  const [sedes, setSedes] = useState<any[]>([]);\n  const [selectedSedeId, setSelectedSedeId] = useState<string>('');"
);

// 3. Update useEffect
const oldEffect = \  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [cierreRes, bancosRes] = await Promise.all([
          getCierrePrevio(today),
          getBancosUtilizados()
        ]);
        setTasaCambio(cierreRes.tasaCambio || 36.5);
        setVentasTotales(cierreRes.ventasTotales || 0);
        setGastosTotales(cierreRes.gastosTotales || 0);
        setTotalEsperado(cierreRes.totalEsperado || 0);
        setBancosSugeridos(bancosRes);
      } catch (err) {
        console.error(err);
        alert('Error cargando datos previos del cierre');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);\;

const newEffect = \  useEffect(() => {
    async function loadInitial() {
      try {
        const sedesData = await getSedes();
        setSedes(sedesData);
        const today = new Date().toISOString().split('T')[0];
        
        // Cargar con la primera sede por defecto si hay
        const [cierreRes, bancosRes] = await Promise.all([
          getCierrePrevio(today, sedesData.length > 0 ? sedesData[0].id : undefined),
          getBancosUtilizados()
        ]);
        
        if (cierreRes.targetSedeId) setSelectedSedeId(cierreRes.targetSedeId);
        else if (sedesData.length > 0) setSelectedSedeId(sedesData[0].id);

        setTasaCambio(cierreRes.tasaCambio || 36.5);
        setVentasTotales(cierreRes.ventasTotales || 0);
        setGastosTotales(cierreRes.gastosTotales || 0);
        setTotalEsperado(cierreRes.totalEsperado || 0);
        setBancosSugeridos(bancosRes);
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Error cargando datos previos del cierre');
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const handleSedeChange = async (newSedeId: string) => {
    setSelectedSedeId(newSedeId);
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const cierreRes = await getCierrePrevio(today, newSedeId);
      setTasaCambio(cierreRes.tasaCambio || 36.5);
      setVentasTotales(cierreRes.ventasTotales || 0);
      setGastosTotales(cierreRes.gastosTotales || 0);
      setTotalEsperado(cierreRes.totalEsperado || 0);
    } catch (err: any) {
      alert(err.message || 'Error cambiando de sede');
    } finally {
      setLoading(false);
    }
  };\;

code = code.replace(oldEffect, newEffect);

// 4. Update guardarCierre
code = code.replace(
  "fecha_cierre: hoy,",
  "sede_id: selectedSedeId,\n          fecha_cierre: hoy,"
);
code = code.replace(
  "router.push('/dashboard');",
  "router.push('/dashboard/caja');"
);

// 5. Add dropdown to Header
const headerSearch = \          <p className="text-neutral-400 text-sm mt-1">Tasa BCV: <span className="text-emerald-400 font-medium">{tasaCambio.toFixed(2)} Bs/$</span></p>
        </div>\;
const headerReplace = \          <p className="text-neutral-400 text-sm mt-1">Tasa BCV: <span className="text-emerald-400 font-medium">{tasaCambio.toFixed(2)} Bs/$</span></p>
          
          {sedes.length > 1 && (
            <div className="mt-4">
              <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-1 block">Sede a registrar:</label>
              <select 
                value={selectedSedeId} 
                onChange={(e) => handleSedeChange(e.target.value)}
                className="bg-black/50 border border-neutral-800 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
              >
                {sedes.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre_sede}</option>
                ))}
              </select>
            </div>
          )}
        </div>\;
code = code.replace(headerSearch, headerReplace);

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', code, 'utf8');
