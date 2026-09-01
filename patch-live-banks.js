const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  // Find the datalist generation block
  const datalistRegex = /<datalist key=\{m\.id\} id=\{\`bancos-list-\$\{m\.id\.replace\(\/\[\^a-zA-Z0-9\]\/g, ''\)\}\`\}>[\s\S]*?<\/datalist>/g;
  
  const newDatalist = `<datalist key={m.id} id={\`bancos-list-\${m.id.replace(/[^a-zA-Z0-9]/g, '')}\`}>
            {Array.from(new Set([
              ...(bancosPorMetodo[m.id] || []),
              ...transacciones.filter(t => t.metodo === m.id && t.banco && t.banco.trim() !== '' && t.banco.trim() !== 'N/A').map(t => t.banco.trim())
            ])).sort().map(b => <option key={b} value={b} />)}
          </datalist>`;

  code = code.replace(datalistRegex, newDatalist);

  fs.writeFileSync(file, code);
});
