const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf8');

content = content.replace('referencia: string;', 'referencia: string;\n  cliente?: string;');

const headerRegex = /<th className="text-left font-normal py-2 text-neutral-400">Referencia<\/th>/;
if (headerRegex.test(content)) {
  content = content.replace(headerRegex, '<th className="text-left font-normal py-2 text-neutral-400">Referencia</th>\n                          <th className="text-left font-normal py-2 text-neutral-400">Cliente (Opcional)</th>');
}

// In editar, there is a table and also update logic. Let's do similar replacements.
content = content.replace('<th className="pb-3 px-2 min-w-[140px]">Referencia</th>', '<th className="pb-3 px-2 min-w-[140px]">Referencia</th>\n                          <th className="pb-3 px-2 min-w-[140px]">Cliente</th>');

const refInputRegex = /<td className="py-2 px-2">\s*<input\s*type="text"\s*className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"\s*value=\{tx\.referencia\}\s*onChange=\{\(e\) => updateTransaccion\(tx\.id, 'referencia', e\.target\.value\)\}\s*placeholder="Ej: 123456"\s*\/>\s*<\/td>/;

content = content.replace(refInputRegex, `<td className="py-2 px-2">
                            <input
                              type="text"
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={tx.referencia}
                              onChange={(e) => updateTransaccion(tx.id, 'referencia', e.target.value)}
                              placeholder="Ej: 123456"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={tx.cliente || ''}
                              onChange={(e) => updateTransaccion(tx.id, 'cliente', e.target.value)}
                              placeholder="Nombre (Opcional)"
                            />
                          </td>`);

content = content.replace(
  "referencia: t.referencia || 'N/A',",
  "referencia: t.referencia || 'N/A',\n          cliente: t.cliente || '',"
);

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', content, 'utf8');
