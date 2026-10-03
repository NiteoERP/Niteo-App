const fs = require('fs');

const files = [
  'src/app/dashboard/caja/nuevo/page.tsx',
  'src/app/dashboard/caja/[id]/editar/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Fix headers. The current headers look like:
  // <th className="pb-3 px-2 min-w-[140px]">Referencia</th>
  // <th className="pb-3 px-2 min-w-[140px]">Cliente</th>
  // <th className="pb-3 px-2 min-w-[140px]">Banco</th>
  
  // We'll reset it entirely:
  const headerRegex = /<th className="pb-3 px-2 min-w-\[140px\]">Referencia<\/th>\s*<th className="pb-3 px-2 min-w-\[140px\]">Cliente(?: \(Opcional\))?<\/th>\s*<th className="pb-3 px-2 min-w-\[140px\]">Banco<\/th>/;
  if (headerRegex.test(content)) {
    content = content.replace(headerRegex, `<th className="pb-3 px-2 min-w-[140px]">Referencia</th>
                            <th className="pb-3 px-2 min-w-[140px]">Banco</th>
                            <th className="pb-3 px-2 min-w-[140px]">Cliente</th>`);
  } else {
    // If it didn't match the corrupted one, try matching the original
    const origHeaderRegex = /<th className="pb-3 px-2 min-w-\[140px\]">Referencia<\/th>\s*<th className="pb-3 px-2 min-w-\[140px\]">Banco<\/th>/;
    content = content.replace(origHeaderRegex, `<th className="pb-3 px-2 min-w-[140px]">Referencia</th>
                            <th className="pb-3 px-2 min-w-[140px]">Banco</th>
                            <th className="pb-3 px-2 min-w-[140px]">Cliente</th>`);
  }

  // 2. Fix the Table Body
  // Let's locate the Banco <td> and insert the Cliente <td> right after it.
  const bancoTdRegex = /<td className="py-2 px-2 relative align-top pt-3">[\s\S]*?<input[\s\S]*?value=\{tx\.banco\}[\s\S]*?list=\{`bancos-list-\$\{metodo\.id\.replace\(\/\[\^a-zA-Z0-9\]\/g, ''\)\}`\}[\s\S]*?\/>\s*<\/td>/;
  
  const clienteTd = `
                              <td className="py-2 px-2 align-top pt-3">
                                <input 
                                  type="text" 
                                  placeholder="Ej: Juan P."
                                  value={tx.cliente || ''}
                                  disabled={isSpectator} onChange={(e) => updateTransaccion(tx.id, 'cliente', e.target.value)}
                                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-lg h-9 px-3 text-white text-sm outline-none transition-colors"
                                />
                              </td>`;

  // Wait, I need to make sure I don't add it twice.
  if (!content.includes(`onChange={(e) => updateTransaccion(tx.id, 'cliente', e.target.value)}`) || !content.includes(`placeholder="Ej: Juan P."`)) {
    content = content.replace(bancoTdRegex, (match) => match + clienteTd);
  } else {
    // Already has it? We need to replace the old broken client td if it exists under Referencia.
    // My previous script FAILED to insert the body td, so it shouldn't exist.
  }

  // 3. Fix Mobile Format
  const mobileBancoRegex = /<div className="relative">\s*<input\s*type="text"\s*placeholder=\{metodo\.id === 'Efectivo' \? 'N\/A' : 'Banco'\}([\s\S]*?)<\/div>/;
  const mobileCliente = `
                            <input 
                              type="text" 
                              placeholder="Cliente (Opc.)"
                              value={tx.cliente || ''}
                              disabled={isSpectator} onChange={(e) => updateTransaccion(tx.id, 'cliente', e.target.value)}
                              className="col-span-2 bg-black/40 border border-neutral-800 focus:border-indigo-500 rounded-lg h-10 px-3 text-white text-sm outline-none transition-colors"
                            />`;
  
  if (!content.includes('placeholder="Cliente (Opc.)"')) {
    content = content.replace(mobileBancoRegex, (match) => match + mobileCliente);
  }

  fs.writeFileSync(file, content, 'utf8');
}
