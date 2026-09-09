const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

const regex = /\{\!editingRow\.parsed_detalles\?\.is_insumos && \([\s\S]*?<\/div><\/>\s*\)\s*<div className="col-span-2">[\s\S]*?<\/div>\s*\}/;

const fixed = `{!editingRow.parsed_detalles?.is_insumos && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1.5">Monto ($)</label>
                      <input type="number" value={editingRow.monto_divisas} onChange={e => setEditingRow({...editingRow, monto_divisas: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1.5">Tasa de Cambio</label>
                      <input type="number" value={editingRow.tasa_cambio} onChange={e => setEditingRow({...editingRow, tasa_cambio: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Concepto / Detalles</label>
                  <textarea rows={2} value={editingRow.detalles} onChange={e => setEditingRow({...editingRow, detalles: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                </div>`;

code = code.replace(regex, fixed);
fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
console.log('Fixed syntax error');
