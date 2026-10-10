const fs = require('fs');
const file = 'src/app/dashboard/proveedores/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /\{\(facStep === 2 \|\| facturaTab === 'gastos'\) && \(/g,
    "{(facStep === 2 || facturaTab === 'gastos') && (<>"
);

code = code.replace(
    /\{errorFactura && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle size=\{14\} \/> \{errorFactura\}<\/p>\}\s*\)\}/,
    "{errorFactura && <p className=\"text-rose-400 text-sm flex items-center gap-2\"><AlertCircle size={14} /> {errorFactura}</p>}</>)}"
);

fs.writeFileSync(file, code);
