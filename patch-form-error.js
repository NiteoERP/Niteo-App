const fs = require('fs');

let code = fs.readFileSync('src/components/configuracion/MetodosComprasForm.tsx', 'utf-8');

const newHandleAdd = `  const [errorMsg, setErrorMsg] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.trim()) return;
    setIsAdding(true);
    setErrorMsg('');
    try {
      const res = await addCompraMetodoPago(nuevo.trim());
      if (res.success) {
        setNuevo('');
        await cargarMetodos();
      } else {
        setErrorMsg('Error: ' + res.error);
        console.error("Error from server:", res.error);
      }
    } catch(err: any) {
      setErrorMsg('Exception: ' + err.message);
    }
    setIsAdding(false);
  };`;

code = code.replace(/const handleAdd = async \([\s\S]*?setIsAdding\(false\);\n  \};/, newHandleAdd.trim());

const newFormHTML = `          <form onSubmit={handleAdd} className="flex gap-2 mt-4">
            <div className="flex-1">
              <input 
                type="text" 
                value={nuevo}
                onChange={e => setNuevo(e.target.value)}
                placeholder="Ej. Transferencia Banco Central..."
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500"
              />
              {errorMsg && <p className="text-rose-400 text-xs mt-1">{errorMsg}</p>}
            </div>
            <button 
              type="submit"
              disabled={isAdding || !nuevo.trim()}
              className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 h-[42px] disabled:opacity-50"
            >
              {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Añadir
            </button>
          </form>`;

code = code.replace(/<form onSubmit=\{handleAdd\}[\s\S]*?<\/form>/, newFormHTML.trim());

fs.writeFileSync('src/components/configuracion/MetodosComprasForm.tsx', code);
console.log("MetodosComprasForm error displaying patched");
