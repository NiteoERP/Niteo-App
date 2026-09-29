const fs = require('fs');

let content = fs.readFileSync('src/components/mesas/NuevaComanda.tsx', 'utf-8');

// Import buscarClientePorCedula
content = content.replace(
    "obtenerCatalogoMesa, enviarComanda, type ItemComanda",
    "obtenerCatalogoMesa, enviarComanda, buscarClientePorCedula, type ItemComanda"
);

// Add buscandoCliente state
const stateInsertion = `  const [clienteCedula, setClienteCedula] = useState('');
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const cedula = clienteCedula.trim();
      if (cedula.length >= 4) {
        setBuscandoCliente(true);
        const data = await buscarClientePorCedula(cedula);
        if (data) {
          if (data.nombre) setClienteNombre(data.nombre);
          if (data.telefono) setClienteTelefono(data.telefono);
        }
        setBuscandoCliente(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [clienteCedula]);`;

content = content.replace(
    "  const [clienteCedula, setClienteCedula] = useState('');\n  const [showClienteForm, setShowClienteForm] = useState(false);",
    stateInsertion
);

// Add loading indicator to the UI for customer search
const oldNitInput = `<label className="text-xs font-bold text-indigo-400/80 mb-1.5 block uppercase tracking-wider">Cédula / NIT</label>`;
const newNitInput = `<label className="text-xs font-bold text-indigo-400/80 mb-1.5 flex items-center justify-between uppercase tracking-wider">
                        <span>Cédula / NIT</span>
                        {buscandoCliente && <Loader2 size={12} className="animate-spin text-indigo-400" />}
                      </label>`;
content = content.replace(oldNitInput, newNitInput);

fs.writeFileSync('src/components/mesas/NuevaComanda.tsx', content, 'utf-8');
console.log("Updated with customer auto-fetch!");
