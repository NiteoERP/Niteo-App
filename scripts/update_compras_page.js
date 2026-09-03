const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/compras/page.tsx', 'utf8');

content = content.replace('import { getUltimasCompras,', 'import { getUltimasCompras, editarFacturaInsumos,');

const openEditRegex = /<button onClick=\{\(\) => \{ setEditingRow\(compra\); setIsEditModalOpen\(true\); \}\} className="text-indigo-400 hover:text-indigo-300 p-1"><Edit2 size=\{16\}\/><\/button>/g;
content = content.replace(openEditRegex, 
  \<button onClick={() => { 
    let parsed = null;
    let txt = compra.detalles || '';
    if (txt.startsWith('{')) {
      try { parsed = JSON.parse(txt); if(parsed.is_insumos) txt = parsed.texto; }catch(e){}
    }
    setEditingRow({...compra, parsed_detalles: parsed, edit_items: parsed?.items ? JSON.parse(JSON.stringify(parsed.items)) : []}); 
    setIsEditModalOpen(true); 
  }} className="text-indigo-400 hover:text-indigo-300 p-1"><Edit2 size={16}/></button>\
);

const openEditRegexMobile = /<button onClick=\{\(\) => \{ setEditingRow\(compra\); setIsEditModalOpen\(true\); \}\} className="text-indigo-400 hover:text-indigo-300 p-2"><Edit2 size=\{18\}\/><\/button>/g;
content = content.replace(openEditRegexMobile, 
  \<button onClick={() => { 
    let parsed = null;
    let txt = compra.detalles || '';
    if (txt.startsWith('{')) {
      try { parsed = JSON.parse(txt); if(parsed.is_insumos) txt = parsed.texto; }catch(e){}
    }
    setEditingRow({...compra, parsed_detalles: parsed, edit_items: parsed?.items ? JSON.parse(JSON.stringify(parsed.items)) : []}); 
    setIsEditModalOpen(true); 
  }} className="text-indigo-400 hover:text-indigo-300 p-2"><Edit2 size={18}/></button>\
);

const handleGuardarEdicionRegex = /const handleGuardarEdicion = async \(\) => \{[\s\S]*?setIsSubmitting\(false\);\s*if \(res\.success\) \{/m;
const newHandleGuardar = \const handleGuardarEdicion = async () => {
    setIsSubmitting(true);
    let res: any;

    if (editingRow.parsed_detalles?.is_insumos) {
      res = await editarFacturaInsumos(editingRow.id, {
        proveedor: editingRow.proveedor,
        moneda: 'USD',
        tasa: editingRow.tasa_cambio,
        metodo_pago: editingRow.metodo_pago || editingRow.modalidad_pago,
        items_viejos: editingRow.parsed_detalles.items,
        items_nuevos: editingRow.edit_items
      });
    } else {
      const payload = {
        comercio_lugar: editingRow.proveedor,
        descripcion_gasto: editingRow.detalles,
        monto_divisas: editingRow.monto_divisas,
        tasa_cambio: editingRow.tasa_cambio,
        modalidad_pago: editingRow.metodo_pago || editingRow.modalidad_pago,
        url_capture: editingRow.id
      };
      res = await actualizarCompraPuntual(editingRow.id, payload);
    }

    setIsSubmitting(false);
    
    if (res.success) {\;
content = content.replace(handleGuardarEdicionRegex, newHandleGuardar);

const modalJSXRegex = /<div className="p-6 space-y-5">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div className="p-6 border-t border-neutral-800 bg-neutral-900\/50 flex justify-end gap-3">/m;
const newModalJSX = \<div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-400 mb-1.5">Proveedor / Comercio</label>
                    <input type="text" value={editingRow.proveedor} onChange={e => setEditingRow({...editingRow, proveedor: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                  </div>
                  
                  {!editingRow.parsed_detalles?.is_insumos && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1.5">Monto (\$)</label>
                        <input type="number" value={editingRow.monto_divisas} onChange={e => setEditingRow({...editingRow, monto_divisas: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1.5">Tasa de Cambio</label>
                        <input type="number" value={editingRow.tasa_cambio} onChange={e => setEditingRow({...editingRow, tasa_cambio: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-neutral-400 mb-1.5">Concepto / Detalles</label>
                        <textarea rows={2} value={editingRow.detalles} onChange={e => setEditingRow({...editingRow, detalles: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                      </div>
                    </>
                  )}

                  {editingRow.parsed_detalles?.is_insumos && (
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-emerald-400 mb-3">Insumos Comprados (El inventario se actualizará auto)</label>
                       <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-neutral-800">
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
                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">\$</span>
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
                       </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1.5">Método de Pago</label>
                    <select value={editingRow.metodo_pago} onChange={e => setEditingRow({...editingRow, metodo_pago: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 appearance-none">
                      <option value="Transferencia BS">Transferencia BS</option>
                      <option value="Efectivo USD">Efectivo USD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex justify-end gap-3">\;
content = content.replace(modalJSXRegex, newModalJSX);

fs.writeFileSync('src/app/dashboard/compras/page.tsx', content);
console.log("Updated page.tsx successfully!");
