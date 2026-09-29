import re

with open('src/components/mesas/NuevaComanda.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add User import
content = content.replace(
    "ShoppingCart, X, Trash2 } from 'lucide-react'",
    "ShoppingCart, X, Trash2, User } from 'lucide-react'"
)

# 2. Add states
state_insertion = """  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteCedula, setClienteCedula] = useState('');
  const [showClienteForm, setShowClienteForm] = useState(false);"""
content = re.sub(r'  const \[clienteNombre, setClienteNombre\] = useState\(''\);\n', state_insertion + '\n', content)

# 3. Modify handleEnviar
old_enviar = """      const result = await enviarComanda({
        terminalCode: terminal.terminalCode,
        tipo: 'comanda',
        mesaIdentificador: mesa.trim(),
        clienteNombre: clienteNombre.trim() || undefined,
        comentarioGeneral: comentarioGeneral.trim() || undefined,"""

new_enviar = """      let nombreFinal = clienteNombre.trim();
      if (clienteCedula.trim()) nombreFinal += ` - CI/NIT: ${clienteCedula.trim()}`;
      if (clienteTelefono.trim()) nombreFinal += ` - Tel: ${clienteTelefono.trim()}`;

      const result = await enviarComanda({
        terminalCode: terminal.terminalCode,
        tipo: 'comanda',
        mesaIdentificador: mesa.trim(),
        clienteNombre: nombreFinal || undefined,
        comentarioGeneral: comentarioGeneral.trim() || undefined,"""
content = content.replace(old_enviar, new_enviar)

# 4. Clear the new states in setTimeout
content = content.replace(
    "setClienteNombre('');",
    "setClienteNombre('');\n        setClienteTelefono('');\n        setClienteCedula('');\n        setShowClienteForm(false);"
)

# 5. Remove original Cliente (opcional) from top
old_top_cliente = r"""          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Cliente \(opcional\)</label>
            <input
              type="text"
              value={clienteNombre}
              onChange=\{e => setClienteNombre\(e\.target\.value\)\}
              placeholder="Nombre"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2\.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>"""
content = re.sub(old_top_cliente, "", content)

# Also make the grid grid-cols-1 instead of grid-cols-2 since Mesa is alone now
content = content.replace('<div className="grid grid-cols-2 gap-3">', '<div className="grid grid-cols-1 gap-3">')

# 6. Add Header icon and Form to Modal
old_modal_header = """            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-400" />
                Resumen de Comanda
              </h3>
              <button onClick={() => setCartOpen(false)} className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">"""

new_modal_header = """            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-400" />
                Resumen de Comanda
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowClienteForm(!showClienteForm)} className={`p-2 rounded-full transition-colors ${showClienteForm || clienteNombre ? 'text-indigo-400 bg-indigo-500/10' : 'text-neutral-400 hover:text-white bg-neutral-800'}`}>
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
              )}"""
content = content.replace(old_modal_header, new_modal_header)

with open('src/components/mesas/NuevaComanda.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated customer info in modal!")
