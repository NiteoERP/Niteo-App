const fs = require('fs');
let code = fs.readFileSync('src/components/pos/LiveSalesFeed.tsx', 'utf-8');

// Add numero_orden and pagos
code = code.replace(
  /numero_documento: newVentaRaw\.numero_documento,/,
  'numero_documento: newVentaRaw.numero_documento,\n            numero_orden: newVentaRaw.numero_orden,'
);
code = code.replace(
  /metodo_pago: \(pagosRes\.data \|\| \[\]\)\[0\]\?\.tipo_pago,/,
  'pagos: (pagosRes.data || []).map(p => ({ tipo_pago: p.tipo_pago, monto: p.monto })),'
);

// Render numero_orden (Mesa/Orden)
// And render exact amounts for payments
code = code.replace(
  /<p className="text-sm font-bold text-emerald-400">\{formatCurrency\(sale\.total\)\}<\/p>\s*<p className="text-xs text-neutral-500">\{sale\.metodo_pago \|\| 'No registrado'\}<\/p>/,
  `<p className="text-sm font-bold text-emerald-400">{formatCurrency(sale.total)}</p>
                      <div className="flex flex-col items-end gap-0.5 mt-1">
                        {sale.pagos && sale.pagos.length > 0 ? (
                          sale.pagos.map((p, idx) => (
                            <span key={idx} className="text-[10px] text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                              {p.tipo_pago}: {formatCurrency(p.monto)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-neutral-500">{sale.esta_pagado ? 'No registrado' : 'A Crédito'}</span>
                        )}
                      </div>`
);

code = code.replace(
  /<span className="truncate">\{sale\.cliente_nombre && sale\.cliente_nombre !== 'Unknown' \? sale\.cliente_nombre : 'Consumidor Final'\}<\/span>/,
  `<span className="truncate">{sale.cliente_nombre && sale.cliente_nombre !== 'Unknown' ? sale.cliente_nombre : 'Consumidor Final'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-start justify-center">
                          <p className="text-xs text-neutral-500 mb-1 w-full text-left">Mesa / Orden</p>
                          <div className="flex items-center justify-start gap-1.5 text-neutral-300 text-sm font-medium w-full text-left">
                            <span className="truncate">{sale.numero_orden || '-'}</span>`
);

fs.writeFileSync('src/components/pos/LiveSalesFeed.tsx', code);
