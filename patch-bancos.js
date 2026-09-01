const fs = require('fs');

function patchFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf-8');

  // Replace the <select> for banco with an <input list="bancos-list">
  code = code.replace(
    /<select\n\s*value=\{t\.banco\}\n\s*onChange=\{\(e\) => updateTransaccion\(t\.id, 'banco', e\.target\.value\)\}\n\s*className="bg-transparent text-white text-sm outline-none w-full"\n\s*>\n\s*<option value="">Seleccionar\.\.\.<\/option>\n\s*\{bancosList\.map\(b => \(\n\s*<option key=\{b\} value=\{b\}>\{b\}<\/option>\n\s*\)\)\}\n\s*<\/select>/g,
    `<input 
      list="bancos-list"
      placeholder="Banco o Titular..."
      value={t.banco}
      onChange={(e) => updateTransaccion(t.id, 'banco', e.target.value)}
      className="bg-transparent text-white text-sm outline-none w-full placeholder:text-neutral-600"
    />`
  );

  // We need to inject the <datalist> somewhere in the component, maybe right after the METODOS mapping or at the very end of the main div
  if (!code.includes('id="bancos-list"')) {
    code = code.replace(
      /<\/div>\n\s*\{showNewMetodo \? \(/,
      `<datalist id="bancos-list">\n            {bancosList.map(b => <option key={b} value={b} />)}\n          </datalist>\n        </div>\n        {showNewMetodo ? (`
    );
  }
  
  // Also, update the UI to change the label from "BANCO" to "BANCO / TITULAR"
  code = code.replace(
    /<span className="text-neutral-500 uppercase tracking-wider hidden sm:inline">Banco<\/span>/g,
    `<span className="text-neutral-500 uppercase tracking-wider hidden sm:inline">Titular / Banco</span>`
  );
  
  // If the mobile view has "Banco:" label
  code = code.replace(
    /<span className="text-neutral-500">Banco:<\/span>/g,
    `<span className="text-neutral-500">Titular/Banco:</span>`
  );

  fs.writeFileSync(filePath, code);
}

patchFile('src/app/dashboard/caja/nuevo/page.tsx');
patchFile('src/app/dashboard/caja/[id]/editar/page.tsx');
