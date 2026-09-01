const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  // Change state
  code = code.replace(
    /const \[bancosSugeridos, setBancosSugeridos\] = useState<string\[\]>\(\[\]\);[\s\S]*?const bancosList = Array\.from\(new Set\(\[\.\.\.sugerenciasDefault, \.\.\.bancosSugeridos\]\)\)\.sort\(\);/g,
    `const [bancosPorMetodo, setBancosPorMetodo] = useState<Record<string, string[]>>({});`
  );
  
  // Also fallback if they are missing sugerenciasDefault ineditar/page.tsx
  code = code.replace(
    /const \[bancosSugeridos, setBancosSugeridos\] = useState<string\[\]>\(\[\]\);/g,
    `const [bancosPorMetodo, setBancosPorMetodo] = useState<Record<string, string[]>>({});`
  );

  // Replace setter
  code = code.replace(/setBancosSugeridos\(bancosRes\);/g, 'setBancosPorMetodo(bancosRes);');

  // Replace datalist definition
  // It used to be:
  // <datalist id="bancos-list">
  //   {bancosList.map((b: string) => <option key={b} value={b} />)}
  // </datalist>
  code = code.replace(
    /<datalist id="bancos-list">[\s\S]*?<\/datalist>/g,
    `{metodos.map(m => (
          <datalist key={m.id} id={\`bancos-list-\${m.id.replace(/\\s+/g, '-')}\`}>
            {(bancosPorMetodo[m.id] || []).map(b => <option key={b} value={b} />)}
          </datalist>
        ))}`
  );

  // Fallback for bancosSugeridos
  code = code.replace(
    /<datalist id="bancos-list">[\s\S]*?\{bancosSugeridos\.map[\s\S]*?<\/datalist>/g,
    `{metodos.map(m => (
          <datalist key={m.id} id={\`bancos-list-\${m.id.replace(/\\s+/g, '-')}\`}>
            {(bancosPorMetodo[m.id] || []).map(b => <option key={b} value={b} />)}
          </datalist>
        ))}`
  );

  // Replace list="bancos-list" with dynamic ID
  code = code.replace(
    /list="bancos-list"/g,
    'list={`bancos-list-${metodo.id.replace(/\\s+/g, \'-\')}`}'
  );

  fs.writeFileSync(file, code);
});
