const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

// Add import
code = code.replace(
  "import { registrarCompra, registrarCompraPuntual } from '@/actions/compras-actions';",
  "import { registrarCompra, registrarCompraPuntual, getComprasMetodosPago, addCompraMetodoPago } from '@/actions/compras-actions';"
);

// Add State
const stateInjection = `  const [dbMetodos, setDbMetodos] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchMetodos = async () => {
      const res = await getComprasMetodosPago();
      if (res.success && res.data) {
        setDbMetodos(res.data);
      }
    };
    fetchMetodos();
  }, []);

  const metodosPago = dbMetodos.length > 0 ? dbMetodos.map(m => m.nombre) : defaultPaymentMethods;
`;

code = code.replace(
  "const metodosPago = empresa?.metodos_pago && empresa.metodos_pago.length > 0 ? empresa.metodos_pago : defaultPaymentMethods;",
  stateInjection
);

// Update onCreateOption logic
const createOption1 = `onChange={(selected) => setGasto({...gasto, metodoPago: selected ? selected.value : ''})}
    onCreateOption={async (inputValue) => {
      const res = await addCompraMetodoPago(inputValue);
      if (res.success && res.data) {
        setDbMetodos([...dbMetodos, res.data]);
        setGasto({...gasto, metodoPago: res.data.nombre});
      }
    }}`;
code = code.replace("onChange={(selected) => setGasto({...gasto, metodoPago: selected ? selected.value : ''})}", createOption1);

const createOption2 = `onChange={(selected) => setEditingRow({...editingRow, metodo_pago: selected ? selected.value : ''})}
    onCreateOption={async (inputValue) => {
      const res = await addCompraMetodoPago(inputValue);
      if (res.success && res.data) {
        setDbMetodos([...dbMetodos, res.data]);
        setEditingRow({...editingRow, metodo_pago: res.data.nombre});
      }
    }}`;
code = code.replace("onChange={(selected) => setEditingRow({...editingRow, metodo_pago: selected ? selected.value : ''})}", createOption2);

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
console.log("ComprasClient patched");
