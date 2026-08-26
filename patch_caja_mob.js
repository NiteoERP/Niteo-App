const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf8');

// Replace table div with hidden sm:block
code = code.replace(
  '<div className="overflow-x-auto overflow-y-visible mt-2">',
  '<div className="mt-2 hidden sm:block overflow-x-auto overflow-y-visible">'
);

// Append mobile version after </table>\n                    </div>
const endTable = '</table>\n                    </div>';
const idx = code.indexOf(endTable);
if (idx !== -1) {
  const insertIndex = idx + endTable.length;
  const mobileVersion = \

                    {/* MOBILE CARDS (Compact version) */}
                    <div className="sm:hidden mt-4 space-y-3">
                      {txs.map((tx, idx) => (
                        <div key={tx.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3 relative group animate-in slide-in-from-top-1 shadow-sm">
                          <div className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                             <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Pago #{idx + 1}</span>
                             <button onClick={() => removeTransaccion(tx.id)} className="text-rose-500/70 hover:text-rose-400 p-1">
                               <Trash2 size={16} />
                             </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2 flex bg-black/40 border border-neutral-800 rounded-lg focus-within:border-indigo-500 overflow-hidden h-10">
                                <select 
                                  value={tx.moneda}
                                  onChange={(e) => updateTransaccion(tx.id, 'moneda', e.target.value as any)}
                                  className="bg-neutral-800 text-white text-xs font-bold px-3 outline-none border-r border-neutral-800 cursor-pointer"
                                >
                                  <option value="VES">BS</option>
                                  <option value="USD">$</option>
                                </select>
                                <input 
                                  type="text" 
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  value={tx.monto}
                                  onChange={(e) => updateTransaccion(tx.id, 'monto', e.target.value)}
                                  className="flex-1 bg-transparent px-3 text-white text-sm font-bold outline-none placeholder:text-neutral-600 min-w-0"
                                />
                            </div>
                            
                            <input 
                              type="text" 
                              placeholder="Ref: 1234"
                              value={tx.referencia}
                              onChange={(e) => updateTransaccion(tx.id, 'referencia', e.target.value)}
                              className="bg-black/40 border border-neutral-800 focus:border-indigo-500 rounded-lg h-10 px-3 text-white text-sm outline-none transition-colors"
                            />
                            
                            <div className="relative">
                              <input 
                                type="text" 
                                placeholder={metodo.id === 'Efectivo' ? 'N/A' : 'Banco'}
                                value={tx.banco}
                                onChange={(e) => updateTransaccion(tx.id, 'banco', e.target.value)}
                                onFocus={() => setMostrarSugerencias('mob-' + tx.id)}
                                onBlur={() => setTimeout(() => setMostrarSugerencias(null), 200)}
                                className="w-full bg-black/40 border border-neutral-800 focus:border-indigo-500 rounded-lg h-10 px-3 text-white text-sm outline-none transition-colors"
                              />
                              {mostrarSugerencias === 'mob-' + tx.id && (
                                <div className="absolute z-[100] w-full top-[100%] mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
                                  {bancosSugeridos.filter(b => b.toLowerCase().includes(tx.banco.toLowerCase())).map(b => (
                                    <button 
                                      key={b}
                                      onMouseDown={(e) => e.preventDefault()} 
                                      onClick={() => selectBanco(tx.id, b)}
                                      className="w-full text-left px-3 py-2 hover:bg-indigo-600 text-white text-xs transition-colors"
                                    >
                                      {b}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {tx.moneda === 'VES' && tx.monto && (
                            <p className="text-[11px] text-neutral-400 text-center font-medium">≈ \ USD</p>
                          )}
                        </div>
                      ))}
                    </div>
\;
  code = code.substring(0, insertIndex) + mobileVersion + code.substring(insertIndex);
}

// Fix char bug
code = code.replace(/%\^/g, '≈');

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', code, 'utf8');
