const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');

const regex = /<span className="text-sm font-medium text-emerald-400 block">\{formatCurrency\(a\.monto\)\}<\/span>\s*<span className="text-xs text-neutral-500">\{a\.metodo\}<\/span>/s;

const replacement = `<span className="text-sm font-medium text-emerald-400 block">{formatCurrency(a.monto)}</span>
                                      <span className="text-xs text-neutral-500">
                                        {a.metodo} 
                                        {a.fecha ? ' - ' + new Date(a.fecha).toLocaleDateString() : ''}
                                      </span>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
