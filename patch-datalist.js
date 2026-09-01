const fs = require('fs');
['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');
  
  // Inject datalist
  code = code.replace(/\{\/\* CREAR NUEVO M.*TODO \*\/\}/, 
    '<datalist id="bancos-list">\n          {bancosList.map(b => <option key={b} value={b} />)}\n        </datalist>\n\n        {/* CREAR NUEVO MÉTODO */}'
  );
  
  fs.writeFileSync(file, code);
});
