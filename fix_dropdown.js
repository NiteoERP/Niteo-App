const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

const selectBlock = \<select value={facProveedorId} onChange={e => setFacProveedorId(e.target.value)}
                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 appearance-none">
                    <option className="bg-neutral-900 text-white" value="">Selecciona un proveedor...</option>
                    {todosProveedores.map(p => <option key={p.id} value={p.id} className="bg-neutral-900 text-white">{p.nombre_comercial}{p.rif_cedula ? \\\ (\\\)\\\ : ''}</option>)}
                  </select>\;

const customDropdown = \
                  <div className="relative">
                    <div 
                      className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm cursor-pointer flex justify-between items-center hover:bg-neutral-900 transition-colors"
                      onClick={() => setShowProvDropdown(!showProvDropdown)}
                    >
                      <span>{facProveedorId ? todosProveedores.find(p => p.id === facProveedorId)?.nombre_comercial : 'Selecciona un proveedor...'}</span>
                      <ChevronDown size={14} className="text-neutral-500" />
                    </div>
                    
                    {showProvDropdown && (
                      <div className="absolute z-[60] w-full mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
                        <div className="p-2 border-b border-neutral-800">
                          <input 
                            type="text" 
                            placeholder="Buscar proveedor..." 
                            value={provSearch}
                            onChange={e => setProvSearch(e.target.value)}
                            className="w-full bg-black/50 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {(() => {
                            const filteredProvs = todosProveedores.filter(p => (p.nombre_comercial || '').toLowerCase().includes(provSearch.toLowerCase()) || (p.rif_cedula || '').toLowerCase().includes(provSearch.toLowerCase()));
                            if (filteredProvs.length === 0) return <div className="px-4 py-3 text-sm text-neutral-500 text-center">No hay resultados</div>;
                            return filteredProvs.map(p => (
                              <div 
                                key={p.id}
                                className="px-4 py-2.5 text-sm text-white hover:bg-neutral-800 cursor-pointer"
                                onClick={() => { setFacProveedorId(p.id); setShowProvDropdown(false); setProvSearch(''); }}
                              >
                                {p.nombre_comercial} {p.rif_cedula && <span className="text-neutral-500 text-xs ml-1">({p.rif_cedula})</span>}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>\.trim();

content = content.replace(selectBlock, customDropdown);
fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');
console.log('Replaced custom dropdown');