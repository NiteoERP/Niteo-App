import re

with open('src/components/mesas/NuevaComanda.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Search state and Search icon
content = content.replace(
    "User } from 'lucide-react'",
    "User, Search, Minus } from 'lucide-react'"
)

# Add search state
state_insertion = """  const [catActiva, setCatActiva] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');"""
content = re.sub(r'  const \[catActiva, setCatActiva\] = useState\(\'Todos\'\);', state_insertion, content)

# 2. Modify prodsFiltrados logic
old_filtrados = """  const prodsFiltrados = catActiva === 'Todos'
    ? productos
    : productos.filter((p: any) => (p.categorias?.nombre || 'Sin categorÃ­a') === catActiva);"""

new_filtrados = """  const prodsFiltrados = productos.filter((p: any) => {
    const matchCat = catActiva === 'Todos' || (p.categorias?.nombre || 'Sin categoría') === catActiva;
    const matchSearch = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchSearch;
  });
  
  const getCartInfo = (prodId: string) => {
    const items = carrito.filter(i => i.producto_id === prodId);
    if (items.length === 0) return null;
    const totalCantidad = items.reduce((s, i) => s + i.cantidad, 0);
    return { totalCantidad };
  };"""
content = content.replace(old_filtrados, new_filtrados)

# 3. Add Search Input UI
old_filtros_ui = """      {/* Filtros de categorÃ­a */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">"""

new_filtros_ui = """      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
        <input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filtros de categorÃ­a */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">"""
content = content.replace(old_filtros_ui, new_filtros_ui)

# 4. Modify Product Card rendering
old_product_card = """          <div className="grid grid-cols-2 gap-2">
            {prodsFiltrados.map((prod: any) => (
              <button
                key={prod.id}
                onClick={() => agregarAlCarrito(prod)}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 p-3 rounded-2xl flex flex-col items-start justify-between min-h-[100px] transition-all text-left group"
              >
                <span className="font-bold text-neutral-200 text-sm group-hover:text-white line-clamp-2 leading-tight">
                  {prod.nombre}
                </span>
                <span className="text-indigo-400 font-bold mt-2">${Number(prod.precio_venta).toFixed(2)}</span>
              </button>
            ))}
          </div>"""

new_product_card = """          <div className="grid grid-cols-2 gap-2">
            {prodsFiltrados.map((prod: any) => {
              const cartInfo = getCartInfo(prod.id);
              const inCart = !!cartInfo;
              return (
                <div key={prod.id} className="relative h-full">
                  <button
                    onClick={() => agregarAlCarrito(prod)}
                    className={`w-full h-full bg-neutral-900 border p-3 rounded-2xl flex flex-col items-start justify-between min-h-[100px] transition-all text-left group ${
                      inCart ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    <span className={`font-bold text-sm line-clamp-2 leading-tight ${inCart ? 'text-white' : 'text-neutral-200 group-hover:text-white'}`}>
                      {prod.nombre}
                    </span>
                    <span className="text-indigo-400 font-bold mt-2">${Number(prod.precio_venta).toFixed(2)}</span>
                  </button>
                  
                  {inCart && (
                    <div className="absolute top-2 right-2 flex items-center bg-indigo-600 rounded-lg shadow-lg overflow-hidden border border-indigo-500">
                      <span className="px-2 py-1 text-xs font-bold text-white bg-indigo-600 select-none">
                        {cartInfo.totalCantidad}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Encontrar todos los items de este producto y quitar 1 del principal (o remover todo si quisieran, 
                          // pero el POS quita 1 por cada clic en el menos). Quitaremos todo para simular la X que pide el usuario.
                          setCarrito(prev => prev.filter(i => i.producto_id !== prod.id));
                        }}
                        className="p-1 bg-rose-500 hover:bg-rose-400 transition-colors border-l border-indigo-500/30"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>"""
content = content.replace(old_product_card, new_product_card)

with open('src/components/mesas/NuevaComanda.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated NuevaComanda.tsx with real-time cart highlights and search bar!")
