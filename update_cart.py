import re

with open('src/components/mesas/NuevaComanda.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add eliminarItem function
content = content.replace(
    "const cambiarCantidad = (key: string, delta: number) => {",
    "const eliminarItem = (key: string) => {\n    setCarrito(prev => prev.filter(i => i.key !== key));\n  };\n\n  const cambiarCantidad = (key: string, delta: number) => {"
)

# Replace the Cart JSX block
old_cart_jsx = r'\{/\* Carrito \*/\}[\s\S]*?(?=</div>\s*\);\s*\})'

new_cart_jsx = """{/* Carrito Sticky Footer y Modal */}
      {carrito.length > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-800 p-4 pb-[env(safe-area-inset-bottom,16px)] z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <button 
            onClick={() => setCartOpen(true)} 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-3.5 px-5 font-bold flex justify-between items-center transition-all shadow-lg shadow-indigo-600/20"
          >
            <div className="flex gap-2 items-center">
              <ShoppingCart size={18} />
              <span>Ver Comanda ({carrito.length})</span>
            </div>
            <span>${total.toFixed(2)} USD</span>
          </button>
        </div>
      )}

      {/* Modal Bottom Sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative bg-neutral-900 rounded-t-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-400" />
                Resumen de Comanda
              </h3>
              <button onClick={() => setCartOpen(false)} className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {carrito.map((item) => (
                <div key={item.key} className="space-y-2 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/80">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{item.nombre}</p>
                      <p className="text-indigo-400 text-xs font-semibold">${(item.cantidad * item.precio_unitario).toFixed(2)}</p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                      <button onClick={() => cambiarCantidad(item.key, -1)} className="w-8 h-8 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white flex items-center justify-center transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="text-white text-sm font-black w-6 text-center">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.key, 1)} className="w-8 h-8 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white flex items-center justify-center transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => eliminarItem(item.key)}
                      className="w-10 h-10 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex gap-2 items-start mt-2">
                    <button
                      onClick={() => setComentandoKey(comentandoKey === item.key ? null : item.key)}
                      className={`p-2 rounded-lg transition-colors shrink-0 ${
                        item.comentario ? 'text-indigo-400 bg-indigo-500/10' : 'text-neutral-500 bg-neutral-800 hover:text-white'
                      }`}
                    >
                      <MessageSquare size={14} />
                    </button>
                    {comentandoKey === item.key || item.comentario ? (
                      <input
                        type="text"
                        value={item.comentario}
                        onChange={e => actualizarComentario(item.key, e.target.value)}
                        placeholder="Nota para cocina (sin cebolla, alergia...)"
                        autoFocus={comentandoKey === item.key}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    ) : null}
                  </div>
                </div>
              ))}
              
              <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Total estimado</span>
                <span className="text-white text-xl font-black">${total.toFixed(2)}</span>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 mt-4">
                  <p className="text-rose-400 text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-neutral-950 border-t border-neutral-800 pb-[env(safe-area-inset-bottom,16px)]">
              <button
                onClick={handleEnviar}
                disabled={enviando || carrito.length === 0 || !mesa.trim()}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                  enviado
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white'
                }`}
              >
                {enviando ? (
                  <><Loader2 size={20} className="animate-spin" /> Enviando...</>
                ) : enviado ? (
                  <><CheckCircle2 size={20} /> ¡Comanda enviada al POS!</>
                ) : (
                  <><Send size={20} /> Confirmar y Enviar</>
                )}
              </button>
              {!mesa.trim() && (
                <p className="text-rose-400 text-xs text-center mt-3 font-medium">Debes ingresar el número de mesa para enviar</p>
              )}
            </div>
          </div>
        </div>
      )}
"""

content = re.sub(old_cart_jsx, new_cart_jsx, content)

with open('src/components/mesas/NuevaComanda.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated NuevaComanda.tsx")
