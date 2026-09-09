const fs = require('fs');
let p = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

// 1. Add import
p = p.replace('import { format } from "date-fns";', 'import { format } from "date-fns";\nimport MobileCompraForm from "@/components/compras/MobileCompraForm";');

// 2. Add state for tab inside modal
p = p.replace('const [errorFactura, setErrorFactura] = useState(\'\');', 'const [errorFactura, setErrorFactura] = useState(\'\');\n  const [facturaTab, setFacturaTab] = useState<\'gastos\'|\'insumos\'>(\'gastos\');');

// 3. Replace the modal header and content to include tabs and MobileCompraForm
const oldModalStr = `<h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-indigo-400" /> Nueva Factura / Deuda</h3>`;
const newModalStr = `<h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-indigo-400" /> Nueva Factura / Deuda</h3>`;

// We'll replace the inner div of the modal
const oldModalBody = `<div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Proveedor *</label>`;

const newModalBody = `<div className="px-6 pt-4">
                <div className="flex gap-4 border-b border-neutral-800">
                  <button onClick={() => setFacturaTab('gastos')} className={\`pb-2 text-sm font-medium transition-colors \${facturaTab === 'gastos' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-white'}\`}>Gasto / Servicio</button>
                  <button onClick={() => setFacturaTab('insumos')} className={\`pb-2 text-sm font-medium transition-colors \${facturaTab === 'insumos' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-white'}\`}>Inventario (Insumos)</button>
                </div>
              </div>
              
              {facturaTab === 'insumos' ? (
                <div className="p-0">
                  <div className="scale-[0.95] origin-top">
                    <MobileCompraForm />
                  </div>
                </div>
              ) : (
              <div className="p-6 space-y-4 pt-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">Proveedor *</label>`;

p = p.replace(oldModalBody, newModalBody);

// We need to close the conditional rendering of the tab
const oldModalFooter = `</select>
              </div>
              {errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
            </div>
            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">`;

const newModalFooter = `</select>
              </div>
              {errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
            </div>
            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">`;

// Add closing tags for the conditional block
p = p.replace(`{errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
            </div>
            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">`, 
            `{errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
            </div>
            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">`); // wait, what?

// Actually let's just do a Regex to find the footer buttons and wrap them so they only show if it's 'gastos'
p = p.replace(`<div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">
              <button onClick={() => setShowFacturaModal(false)}`, 
`</div>
              )}
              {facturaTab === 'gastos' && (
            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">
              <button onClick={() => setShowFacturaModal(false)}`);

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', p);
console.log('✅ patched');
