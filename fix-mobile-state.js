const fs = require('fs');
let code = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');

const injection = `  const [dbMetodos, setDbMetodos] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchM = async () => {
      const res = await getComprasMetodosPago();
      if (res.success && res.data) setDbMetodos(res.data);
    };
    fetchM();
  }, []);

  const metodosDisponibles = dbMetodos.length > 0 ? dbMetodos.map(m => m.nombre) : ['Efectivo USD', 'Efectivo Bs', 'Pago Móvil', 'Zelle', 'Punto de Venta'];
`;

// Replace the line that starts with `  const metodosDisponibles = [`
code = code.replace(/  const metodosDisponibles = \[.*\];/, injection);

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', code);
console.log("Mobile state injected");
