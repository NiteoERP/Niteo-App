const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf-8');

const regex = /<p className="font-black text-rose-400">\{formatCurrency\(fac\.saldo_pendiente\)\}<\/p>\s*<\/div>\s*<button/;

const replacement = `<p className="font-black text-rose-400">{formatCurrency(fac.saldo_pendiente)}</p>
                              </div>
                              <button`;

code = code.replace(regex, replacement);

const regex2 = /<\/button>\s*<\/div>\s*<\/div>\s*\)\)\}\s*<\/div>/;

const replacement2 = `</button>
                            </div>
                          </div>
                          
                          {/* Historial de Pagos si tiene */}
                          {fac.pagos && fac.pagos.length > 0 && (
                            <div className="bg-neutral-950 p-3 rounded-b-xl border border-neutral-800 border-t-0 -mt-2 mb-4 ml-4 mr-4">
                              <p className="text-xs font-bold text-neutral-500 uppercase mb-2">Historial de Pagos de esta Factura</p>
                              <div className="space-y-1">
                                {fac.pagos.map((pago: any) => (
                                  <div key={pago.id} className="flex justify-between items-center text-xs py-1 border-b border-neutral-800/50 last:border-0">
                                    <span className="text-neutral-400">{format(new Date(pago.created_at), "dd/MM/yyyy HH:mm")}</span>
                                    <span className="text-emerald-400 font-medium">{pago.metodo_pago} {pago.referencia ? '('+pago.referencia+')' : ''}</span>
                                    <span className="font-bold text-white">{formatCurrency(pago.monto)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          </React.Fragment>
                        ))}
                      </div>`;

// Wait, the map needs React.Fragment wrapping if I return siblings!
code = code.replace(/\{facturasProveedor\.map\(fac => \(\s*<div key=\{fac\.id\} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-neutral-700 transition-colors">/s, `{facturasProveedor.map(fac => (
                          <React.Fragment key={fac.id}>
                          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-neutral-700 transition-colors z-10 relative">`);

code = code.replace(regex2, replacement2);

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', code);
