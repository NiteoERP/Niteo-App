const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');
  
  // Remove the state
  code = code.replace(/const \[mostrarSugerencias, setMostrarSugerencias\] = useState<string \| null>\(null\);\n/g, '');
  
  // Remove the selectBanco function
  code = code.replace(/const selectBanco = \([\s\S]*?setMostrarSugerencias\(null\);\n\s*\};\n/g, '');

  // Remove the custom dropdowns and onFocus/onBlur from the inputs
  code = code.replace(/onFocus=\{\(\) => setMostrarSugerencias\([^\)]+\)\}\n\s*onBlur=\{\(\) => setTimeout\(\(\) => setMostrarSugerencias\(null\), 200\)\}/g, 'list="bancos-list"');

  // Remove the actual dropdown div in desktop view
  code = code.replace(/\{mostrarSugerencias === tx\.id && \([\s\S]*?\}\)\n\s*\}\n\s*<\/td>/g, '</td>');

  // Remove the actual dropdown div in mobile view
  code = code.replace(/\{mostrarSugerencias === 'mob-' \+ tx\.id && \([\s\S]*?\}\)\n\s*\}/g, '');

  fs.writeFileSync(file, code);
});
