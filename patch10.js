const fs = require('fs');
let p = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

// Convert everything to LF to avoid issues
p = p.replace(/\r\n/g, '\n');

const oldModalBodyStart = `<div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">Proveedor *</label>`;

const newModalBodyStart = `<div className="px-6 pt-4">
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

p = p.replace(oldModalBodyStart, newModalBodyStart);

const oldFooterTarget = `{errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
            </div>
            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">
              <button onClick={() => setShowFacturaModal(false)} className="px-5 py-2.5 rounded-xl text-neutral-300 hover:bg-neutral-800 text-sm">Cancelar</button>
              <button onClick={handleCrearFactura} disabled={enviandoFactura}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
                {enviandoFactura ? 'Registrando...' : <><FileText size={16} /> Registrar Factura</>}
              </button>
            </div>
          </div>
        </div>
      )}`;

const newFooterTarget = `{errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
            </div>
              )}
              {facturaTab === 'gastos' && (
            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">
              <button onClick={() => setShowFacturaModal(false)} className="px-5 py-2.5 rounded-xl text-neutral-300 hover:bg-neutral-800 text-sm">Cancelar</button>
              <button onClick={handleCrearFactura} disabled={enviandoFactura}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
                {enviandoFactura ? 'Registrando...' : <><FileText size={16} /> Registrar Factura</>}
              </button>
            </div>
              )}
          </div>
        </div>
      )}`;

p = p.replace(oldFooterTarget, newFooterTarget);

// Remove duplicated classes
p = p.replace(/className="bg-neutral-900 text-white" value="([^"]*)" className="bg-neutral-900 text-white"/g, 'className="bg-neutral-900 text-white" value="$1"');

// Save it back with CRLF
p = p.replace(/\n/g, '\r\n');
fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', p);
console.log('✅ syntax fixed with CRLF handling');
