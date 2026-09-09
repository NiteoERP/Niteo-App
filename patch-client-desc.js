const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

// The current code is:
/*
                  {!editingRow.parsed_detalles?.is_insumos && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1.5">Monto ($)</label>
                        ...
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1.5">Tasa de Cambio</label>
                        ...
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-neutral-400 mb-1.5">Concepto / Detalles</label>
                        <textarea rows={2} value={editingRow.detalles} onChange={e => setEditingRow({...editingRow, detalles: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                      </div>
                    </>
                  )}
*/

// We need to move the <div className="col-span-2"> Concepto / Detalles block OUTSIDE the check
const pattern = /\{!editingRow\.parsed_detalles\?\.is_insumos && \([\s\S]*?<\/div>[\s\S]*?<\/div>([\s\S]*?)<\/>\s*\)/;

const match = code.match(pattern);
if (match) {
  const conceptoBlock = match[1];
  
  // Replace the whole block without the conceptoBlock, and append the conceptoBlock outside
  let newBlock = match[0].replace(conceptoBlock, '');
  newBlock = newBlock + conceptoBlock;
  
  code = code.replace(pattern, newBlock);
}

// When editing Insumos invoice, we need to pass the updated 'detalles' to editarFacturaInsumos
code = code.replace(
  /res = await editarFacturaInsumos\(editingRow\.id, \{/,
  "res = await editarFacturaInsumos(editingRow.id, {\n          descripcion: editingRow.detalles,"
);

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
console.log('ComprasClient patched for editable description');
