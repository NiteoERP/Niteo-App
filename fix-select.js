const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');

const rsStyles = `
  const rsStyles = {
    control: (base) => ({
      ...base,
      background: 'rgba(0,0,0,0.5)',
      borderColor: '#262626',
      minHeight: '3.5rem',
      borderRadius: '0.75rem',
    }),
    menu: (base) => ({ ...base, background: '#171717', border: '1px solid #262626' }),
    option: (base, state) => ({ ...base, background: state.isFocused ? '#262626' : 'transparent', color: 'white' }),
    singleValue: (base) => ({ ...base, color: 'white' }),
    input: (base) => ({ ...base, color: 'white' })
  };
`;

code = code.replace(
  /const \[alertMsg, setAlertMsg\] = useState\(\{ text: '', type: '' \}\);/,
  `const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });
${rsStyles}`
);

code = code.replace(
  /<select value=\{gasto\.metodoPago\} onChange=\{e => setGasto\(\{\.\.\.gasto, metodoPago: e\.target\.value\}\)\} className="w-full h-14 bg-black\/50 border border-neutral-800 text-white text-base rounded-xl px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none">\s*\{metodosPago\.map\(\(metodo: string\) => <option key=\{metodo\} value=\{metodo\}>\{metodo\}<\/option>\)\}\s*<\/select>/,
  `<CreatableSelect
    options={metodosPago.map((m) => ({ value: m, label: m }))}
    value={{ value: gasto.metodoPago, label: gasto.metodoPago }}
    onChange={(selected) => setGasto({...gasto, metodoPago: selected ? selected.value : ''})}
    styles={rsStyles}
    placeholder="Selecciona o escribe..."
    formatCreateLabel={(val) => \`Usar "\${val}"\`}
  />`
);

code = code.replace(
  /<select value=\{editingRow\.metodo_pago\} onChange=\{e => setEditingRow\(\{\.\.\.editingRow, metodo_pago: e\.target\.value\}\)\} className="w-full bg-black\/50 border border-neutral-800 text-white rounded-xl px-4 py-2\.5 focus:outline-none focus:border-indigo-500 appearance-none">\s*\{metodosPago\.map\(\(metodo: string\) => <option key=\{metodo\} value=\{metodo\}>\{metodo\}<\/option>\)\}\s*<\/select>/,
  `<CreatableSelect
    options={metodosPago.map((m) => ({ value: m, label: m }))}
    value={{ value: editingRow.metodo_pago, label: editingRow.metodo_pago }}
    onChange={(selected) => setEditingRow({...editingRow, metodo_pago: selected ? selected.value : ''})}
    styles={rsStyles}
    placeholder="Selecciona o escribe..."
    formatCreateLabel={(val) => \`Usar "\${val}"\`}
  />`
);

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
