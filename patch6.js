const fs = require('fs');
let p = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

const targetStr = `              {errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
            </div>
            </div>
              )}
              {facturaTab === 'gastos' && (`;

const replaceStr = `              {errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {errorFactura}</p>}
            </div>
              )}
              {facturaTab === 'gastos' && (`;

p = p.replace(targetStr, replaceStr);

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', p);
console.log('✅ syntax fixed');
