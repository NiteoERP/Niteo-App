const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

const replacement = `
                          <div className="relative">
                            <div 
                              className="w-full bg-black/50 border border-neutral-700 text-white rounded-lg px-2.5 py-1.5 text-xs cursor-pointer flex justify-between items-center"
                              onClick={() => setShowEditAddInsumoDropdown(!showEditAddInsumoDropdown)}
                            >
                              <span className="truncate">{editAddInsumoSearch ? insumosList.find(i => i.id === editAddInsumoSearch)?.nombre : 'Seleccionar insumo...'}</span>
                              <ChevronDown size={12} className="text-neutral-500 flex-shrink-0 ml-1" />
                            </div>
                            
                            {showEditAddInsumoDropdown && (
                              <div className="absolute z-[80] w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
                                <div className="p-1 border-b border-neutral-700">
                                  <input 
                                    type="text" 
                                    placeholder="Buscar..." 
                                    value={editAddInsumoFilterText}
                                    onChange={e => setEditAddInsumoFilterText(e.target.value)}
                                    className="w-full bg-black/50 border border-neutral-700 rounded text-xs px-2 py-1 text-white focus:outline-none"
                                    autoFocus
                                  />
                                </div>
                                <div className="max-h-40 overflow-y-auto">
                                  {(() => {
                                    const filtered = insumosList.filter(i => (i.nombre || '').toLowerCase().includes(editAddInsumoFilterText.toLowerCase()));
                                    if (filtered.length === 0) return <div className="p-2 text-xs text-neutral-500 text-center">Sin resultados</div>;
                                    return filtered.map(i => (
                                      <div 
                                        key={i.id}
                                        className="px-2 py-1.5 text-xs text-white hover:bg-neutral-800 cursor-pointer"
                                        onClick={() => {
                                          setEditAddInsumoSearch(i.id);
                                          setShowEditAddInsumoDropdown(false);
                                          setEditAddInsumoFilterText('');
                                        }}
                                      >
                                        {i.nombre} <span className="text-neutral-500 ml-1">({i.cantidad_actual || 0} {i.unidad_medida})</span>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
`.trim();

content = content.replace(/<select\s+value=\{editAddInsumoSearch\}[\s\S]*?<\/select>/g, replacement);

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');
console.log('Replaced editAdd selects');