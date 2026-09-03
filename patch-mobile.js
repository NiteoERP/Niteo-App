const fs = require('fs');

let code = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');

// Imports
code = code.replace(
  "import { registrarFacturaInsumos } from '@/actions/compras-actions';",
  "import { registrarFacturaInsumos, getComprasMetodosPago, addCompraMetodoPago } from '@/actions/compras-actions';"
);

// State
const newState = `  const [dbMetodos, setDbMetodos] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchM = async () => {
      const res = await getComprasMetodosPago();
      if (res.success && res.data) setDbMetodos(res.data);
    };
    fetchM();
  }, []);

  const metodosDisponibles = dbMetodos.length > 0 ? dbMetodos.map(m => m.nombre) : ['Efectivo USD', 'Efectivo Bs', 'Pago M\u00f3vil', 'Zelle', 'Punto de Venta'];`;

code = code.replace(
  "const metodosDisponibles = ['Efectivo USD', 'Efectivo Bs', 'Pago M\uFFFDvil', 'Zelle', 'Punto de Venta'];",
  newState
);
code = code.replace(
  "const metodosDisponibles = ['Efectivo USD', 'Efectivo Bs', 'Pago Mvil', 'Zelle', 'Punto de Venta'];",
  newState
);


// Replace standard <select> with CreatableSelect for the payment method
const selectHTML = `<CreatableSelect
                options={metodosDisponibles.map(m => ({value: m, label: m}))}
                value={{value: metodoPago, label: metodoPago}}
                onChange={(s) => setMetodoPago(s ? s.value : '')}
                onCreateOption={async (val) => {
                  const res = await addCompraMetodoPago(val);
                  if (res.success && res.data) {
                    setDbMetodos([...dbMetodos, res.data]);
                    setMetodoPago(res.data.nombre);
                  }
                }}
                placeholder="Selecciona o crea..."
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: '#171717',
                    borderColor: '#262626',
                    borderRadius: '0.75rem',
                    padding: '2px',
                    color: 'white',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#4F46E5' }
                  }),
                  singleValue: (base) => ({ ...base, color: 'white' }),
                  input: (base) => ({ ...base, color: 'white' }),
                  menu: (base) => ({ ...base, backgroundColor: '#171717', border: '1px solid #262626' }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? '#262626' : '#171717',
                    color: 'white',
                    '&:active': { backgroundColor: '#4F46E5' }
                  })
                }}
              />`;

code = code.replace(
  /<select[\s\S]*?<\/select>/,
  selectHTML
);


fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', code);
console.log("MobileCompraForm patched");
