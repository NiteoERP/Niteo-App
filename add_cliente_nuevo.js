const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf8');

content = content.replace('referencia: string;', 'referencia: string;\n  cliente?: string;');

const headerRegex = /<th className="text-left font-normal py-2 text-neutral-400">Referencia<\/th>/;
if (headerRegex.test(content)) {
  content = content.replace(headerRegex, '<th className="text-left font-normal py-2 text-neutral-400">Referencia</th>\n                      <th className="text-left font-normal py-2 text-neutral-400">Cliente (Opcional)</th>');
}

const inputRegex = /<input\s+type="text"\s+disabled=\{isSpectator\}\s+className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"\s+value=\{tx\.referencia\}\s+onChange=\{\(e\) => updateTransaccion\(tx\.id, 'referencia', e\.target\.value\)\}\s+placeholder="Ej: 123456"\s+\/>\s+<\/td>/;

if (inputRegex.test(content)) {
  content = content.replace(inputRegex, `<input
                          type="text"
                          disabled={isSpectator}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={tx.referencia}
                          onChange={(e) => updateTransaccion(tx.id, 'referencia', e.target.value)}
                          placeholder="Ej: 123456"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={isSpectator}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={tx.cliente || ''}
                          onChange={(e) => updateTransaccion(tx.id, 'cliente', e.target.value)}
                          placeholder="Nombre..."
                        />
                      </td>`);
}

content = content.replace(
  "referencia: t.referencia || 'N/A',",
  "referencia: t.referencia || 'N/A',\n          cliente: t.cliente || '',"
);

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', content, 'utf8');
