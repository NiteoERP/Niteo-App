const fs = require('fs');

// ==========================================
// PATCH 1: ComprasClient.tsx - Fix edit modal
// ==========================================
let client = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

// 1a. Increase modal size and add overflow-y-auto
client = client.replace(
  'bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300',
  'bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col'
);

// 1b. Make the body scrollable
client = client.replace(
  '<div className="p-6 space-y-5">',
  '<div className="p-6 space-y-5 overflow-y-auto flex-1">'
);

// 1c. Replace the insumos items renderer in the edit modal with a richer version
const oldItemsRenderer = `                     <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-neutral-800">
                        {editingRow.edit_items?.map((it:any, idx:number) => (
                           <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                              <span className="flex-1 text-sm font-medium text-white">{it.nombre_nuevo}</span>
                              <div className="flex gap-2 w-full sm:w-auto">
                                 <input type="number" value={it.cantidad} onChange={e => {
                                    const n = [...editingRow.edit_items];
                                    n[idx].cantidad = Number(e.target.value);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="w-24 bg-black/50 border border-neutral-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500" title="Cantidad" />
                                 
                                 <div className="relative">
                                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                                   <input type="number" value={it.costoTotal} onChange={e => {
                                      const n = [...editingRow.edit_items];
                                      n[idx].costoTotal = Number(e.target.value);
                                      setEditingRow({...editingRow, edit_items: n});
                                   }} className="w-24 bg-black/50 border border-neutral-800 text-white text-sm rounded-lg pl-6 pr-3 py-1.5 focus:outline-none focus:border-indigo-500" title="Costo Total" />
                                 </div>
                                 <button onClick={() => {
                                    const n = editingRow.edit_items.filter((_:any, i:number) => i !== idx);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="p-1.5 text-neutral-500 hover:text-rose-400"><Trash2 size={16}/></button>
                              </div>
                           </div>
                        ))}
                     </div>`;

const newItemsRenderer = `                     {/* Column headers */}
                     <div className="hidden sm:grid grid-cols-12 gap-2 px-3 pb-1 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                       <div className="col-span-4">Insumo</div>
                       <div className="col-span-2 text-center">Cantidad</div>
                       <div className="col-span-2 text-center">P. Unit.</div>
                       <div className="col-span-2 text-center">Total</div>
                       <div className="col-span-1 text-center">Moneda</div>
                       <div className="col-span-1"></div>
                     </div>
                     <div className="space-y-2 bg-black/20 p-3 rounded-xl border border-neutral-800">
                        {editingRow.edit_items?.map((it:any, idx:number) => {
                          const precioUnit = it.cantidad > 0 ? (it.costoTotal / it.cantidad) : 0;
                          const monedaBadge = it.monedaItem === 'VES' ? 'VES' : 'USD';
                          return (
                           <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                              {/* Nombre */}
                              <div className="col-span-12 sm:col-span-4">
                                <span className="text-sm font-semibold text-white">{it.nombre_nuevo}</span>
                                <p className="text-xs text-neutral-500 sm:hidden">{monedaBadge} · {it.cantidad} × {precioUnit.toFixed(2)} = {it.costoTotal.toFixed(2)}</p>
                              </div>
                              {/* Cantidad */}
                              <div className="col-span-4 sm:col-span-2">
                                <label className="text-xs text-neutral-500 sm:hidden mb-0.5 block">Cant.</label>
                                <input type="number" min="0.01" step="any" value={it.cantidad} onChange={e => {
                                    const n = [...editingRow.edit_items];
                                    n[idx].cantidad = Number(e.target.value);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="w-full bg-black/50 border border-neutral-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-center" />
                              </div>
                              {/* Precio unit (read-only computed) */}
                              <div className="col-span-4 sm:col-span-2">
                                <label className="text-xs text-neutral-500 sm:hidden mb-0.5 block">P.Unit.</label>
                                <div className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-400 text-sm rounded-lg px-2 py-1.5 text-center">
                                  {precioUnit.toFixed(2)}
                                </div>
                              </div>
                              {/* Total */}
                              <div className="col-span-4 sm:col-span-2">
                                <label className="text-xs text-neutral-500 sm:hidden mb-0.5 block">Total</label>
                                <input type="number" min="0" step="any" value={it.costoTotal} onChange={e => {
                                    const n = [...editingRow.edit_items];
                                    n[idx].costoTotal = Number(e.target.value);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="w-full bg-black/50 border border-neutral-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-center" />
                              </div>
                              {/* Moneda badge */}
                              <div className="hidden sm:flex col-span-1 justify-center">
                                <span className={\`text-xs font-bold px-2 py-1 rounded \${monedaBadge === 'USD' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}\`}>{monedaBadge}</span>
                              </div>
                              {/* Delete */}
                              <div className="hidden sm:flex col-span-1 justify-center">
                                <button onClick={() => {
                                    const n = editingRow.edit_items.filter((_:any, i:number) => i !== idx);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={16}/></button>
                              </div>
                           </div>
                          );
                        })}
                     </div>`;

client = client.replace(oldItemsRenderer, newItemsRenderer);

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', client);
console.log('✅ ComprasClient.tsx patched');
