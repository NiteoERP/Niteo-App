const fs = require('fs');

let c = fs.readFileSync('src/app/dashboard/catalogo/ProductoForm.tsx', 'utf8');

const regex = /<label className="text-sm font-medium text-neutral-400 block mb-1\.5">Descripc[\s\S]*?\(Opcional\)<\/label>/;

const replacement = `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                <label className="text-sm font-medium text-neutral-400 block mb-1.5">Código de Barras (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Escanea o escribe el código"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-indigo-500 transition-colors"
                  value={formData.codigo_barras}
                  onChange={e => setFormData({...formData, codigo_barras: e.target.value})}
                />
              </div>
            </div>
            
            <label className="text-sm font-medium text-neutral-400 block mb-1.5">Descripción (Opcional)</label>`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    
    // Also remove the old codigo de barras field if it was there later on
    const oldCodigoRegex = /<div>\s*<label className="text-sm font-medium text-neutral-400 block mb-1\.5">C[óÃ³]digo de Barras[\s\S]*?<\/div>/g;
    // Actually, just let's check if it exists twice and remove the second one.
    // Instead of regex, let's just leave it or do a manual cleanup.
    fs.writeFileSync('src/app/dashboard/catalogo/ProductoForm.tsx', c, 'utf8');
    console.log("Fixed ProductoForm");
} else {
    console.log("No match found for Descripción in ProductoForm");
}
