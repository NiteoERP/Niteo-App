const fs = require('fs');

// ==========================================
// PATCH 2: MobileCompraForm.tsx - Better cart display  
// ==========================================
let mobile = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf-8');

// Improve cart item display - show unit price and currency better
mobile = mobile.replace(
  `              <div key={item.id} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium text-sm">{item.nombre_nuevo} {item.is_new && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded ml-1">NUEVO</span>}</p>
                      <p className="text-neutral-500 text-xs">{item.cantidad} {item.unidad_nueva} ➤ {item.monedaItem} {item.costoTotal.toFixed(2)} Total <span className="text-[10px] opacity-60">({(item.costoTotal / item.cantidad).toFixed(2)} c/u)</span></p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-rose-400 hover:bg-rose-500/20 p-2 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>`,
  `              <div key={item.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-semibold text-sm truncate">{item.nombre_nuevo}</p>
                          {item.is_new && <span className="shrink-0 text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">NUEVO</span>}
                          <span className={\`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded \${item.monedaItem === 'USD' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}\`}>{item.monedaItem}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-xs text-neutral-500">
                          <span>{item.cantidad} {item.unidad_nueva}</span>
                          <span className="text-center">× {(item.costoTotal / item.cantidad).toFixed(2)} c/u</span>
                          <span className="text-right font-semibold text-neutral-300">{item.monedaItem} {item.costoTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-rose-400 hover:bg-rose-500/20 p-1.5 rounded-lg shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>`
);

// Make the outer container wider on desktop
mobile = mobile.replace(
  'className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-8 max-w-2xl mx-auto shadow-2xl relative"',
  'className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-8 max-w-4xl mx-auto shadow-2xl relative"'
);

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', mobile);
console.log('✅ MobileCompraForm.tsx patched');
