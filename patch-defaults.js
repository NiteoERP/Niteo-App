const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  // We need to inject the sugerencias logic
  // Find where bancosSugeridos is declared
  code = code.replace(
    /const \[bancosSugeridos, setBancosSugeridos\] = useState<string\[\]>\(\[\]\);/,
    `const [bancosSugeridos, setBancosSugeridos] = useState<string[]>([]);
  
  const sugerenciasDefault = ['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'BNC', 'Bancaribe', 'Zelle', 'Bicentenario', 'Bancamiga', 'Tesoro', 'Exterior'];
  const bancosList = Array.from(new Set([...sugerenciasDefault, ...bancosSugeridos])).sort();`
  );

  // Replace the datalist mapping to use bancosList instead of bancosSugeridos
  code = code.replace(
    /\{bancosSugeridos\.map\(\(b: string\) => <option key=\{b\} value=\{b\} \/>\)\}/g,
    `{bancosList.map((b: string) => <option key={b} value={b} />)}`
  );

  fs.writeFileSync(file, code);
});
