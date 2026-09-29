const fs = require('fs');

let content = fs.readFileSync('src/components/mesas/NuevaComanda.tsx', 'utf-8');

// 1. Add User import
content = content.replace(
    "ShoppingCart, X, Trash2 } from 'lucide-react'",
    "ShoppingCart, X, Trash2, User } from 'lucide-react'"
);

// 2. Add states
const stateInsertion = `  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteCedula, setClienteCedula] = useState('');
  const [showClienteForm, setShowClienteForm] = useState(false);`;
content = content.replace(/  const \[clienteNombre, setClienteNombre\] = useState\(''\);\n/, stateInsertion + '\n');

// 3. Modify handleEnviar
const oldEnviar = `      const result = await enviarComanda({
        terminalCode: terminal.terminalCode,
        tipo: 'comanda',
        mesaIdentificador: mesa.trim(),
        clienteNombre: clienteNombre.trim() || undefined,
        comentarioGeneral: comentarioGeneral.trim() || undefined,`;

const newEnviar = `      let nombreFinal = clienteNombre.trim();
      if (clienteCedula.trim()) nombreFinal += \` - CI/NIT: \${clienteCedula.trim()}\`;
      if (clienteTelefono.trim()) nombreFinal += \` - Tel: \${clienteTelefono.trim()}\`;

      const result = await enviarComanda({
        terminalCode: terminal.terminalCode,
        tipo: 'comanda',
        mesaIdentificador: mesa.trim(),
        clienteNombre: nombreFinal || undefined,
        comentarioGeneral: comentarioGeneral.trim() || undefined,`;
content = content.replace(oldEnviar, newEnviar);

// 4. Clear the new states in setTimeout
content = content.replace(
    "setClienteNombre('');",
    "setClienteNombre('');\n        setClienteTelefono('');\n        setClienteCedula('');\n        setShowClienteForm(false);"
);

// 5. Remove original Cliente (opcional) from top
const oldTopCliente = /          <div>\s*<label className="text-xs text-neutral-500 mb-1 block">Cliente \(opcional\)<\/label>\s*<input\s*type="text"\s*value=\{clienteNombre\}\s*onChange=\{e => setClienteNombre\(e\.target\.value\)\}\s*placeholder="Nombre"\s*className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2\.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"\s*\/>\s*<\/div>/m;
content = content.replace(oldTopCliente, "");

// Also make the grid grid-cols-1 instead of grid-cols-2 since Mesa is alone now
content = content.replace('<div className="grid grid-cols-2 gap-3">', '<div className="grid grid-cols-1 gap-3">');

// 6. Add Header icon and Form to Modal
const oldModalHeader = `            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-400" />
                Resumen de Comanda
              </h3>
              <button onClick={() => setCartOpen(false)} className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">`;

const newModalHeader = `            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-400" />
                Resumen de Comanda
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowClienteForm(!showClienteForm)} className={\`p-2 rounded-full transition-colors \${showClienteForm || clienteNombre ? 'text-indigo-400 bg-indigo-500/10' : 'text-neutral-400 hover:text-white bg-neutral-800'}\`}>
                  <User size={18} />
                </button>
                <button onClick={() => setCartOpen(false)} className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {showClienteForm && (
                <div className="bg-neutral-950/80 border border-indigo-500/30 p-4 rounded-xl mb-4 space-y-3 shadow-inner">
                  <div>
                    <label className="text-xs font-bold text-indigo-400/80 mb-1.5 block uppercase tracking-wider">Nombre del Cliente</label>
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={e => setClienteNombre(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-indigo-400/80 mb-1.5 block uppercase tracking-wider">Teléfono</label>
                      <input
                        type="tel"
                        value={clienteTelefono}
                        onChange={e => setClienteTelefono(e.target.value)}
                        placeholder="Opcional"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-indigo-400/80 mb-1.5 block uppercase tracking-wider">Cédula / NIT</label>
                      <input
                        type="text"
                        value={clienteCedula}
                        onChange={e => setClienteCedula(e.target.value)}
                        placeholder="Opcional"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}`;
content = content.replace(oldModalHeader, newModalHeader);

fs.writeFileSync('src/components/mesas/NuevaComanda.tsx', content, 'utf-8');
console.log("Updated customer info in modal!");
