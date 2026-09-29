const fs = require('fs');

let c = fs.readFileSync('src/app/dashboard/catalogo/ProductoForm.tsx', 'utf8');

const targetStr = `            <div>
              <label className="text-sm font-medium text-neutral-400 block mb-1.5">DescripciÃ³n (Opcional)</label>`;

const newStr = `            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-400 block mb-1.5">Sucursal Asociada</label>
                <select
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-indigo-300 font-medium focus:border-indigo-500 transition-colors"
                  value={formData.sede_id}
                  onChange={e => setFormData({...formData, sede_id: e.target.value})}
                >
                  {sedes.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre_sede}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-400 block mb-1.5">CÃ³digo de Barras (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Escanea o escribe el cÃ³digo"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-indigo-500 transition-colors"
                  value={formData.codigo_barras}
                  onChange={e => setFormData({...formData, codigo_barras: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-400 block mb-1.5">DescripciÃ³n (Opcional)</label>`;

c = c.replace(targetStr, newStr);

// Now remove the old Codigo de Barras block if it exists
const oldCodigoBlock = `            <div>
              <label className="text-sm font-medium text-neutral-400 block mb-1.5">CÃ³digo de Barras (Opcional)</label>
              <input 
                type="text" 
                placeholder="Escanea o escribe el cÃ³digo"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-indigo-500 transition-colors"
                value={formData.codigo_barras}
                onChange={e => setFormData({...formData, codigo_barras: e.target.value})}
              />
            </div>`;
c = c.replace(oldCodigoBlock, '');

fs.writeFileSync('src/app/dashboard/catalogo/ProductoForm.tsx', c, 'utf8');
console.log('Success');
