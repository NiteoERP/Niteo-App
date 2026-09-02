const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf-8');

// Añadir fechaPago state
code = code.replace(`const [bancoOrigen, setBancoOrigen] = useState("");`, `const [bancoOrigen, setBancoOrigen] = useState("");
    const [fechaPago, setFechaPago] = useState("");`);

// Modificar handleOpenPago
code = code.replace(`setReferencia("");
      setBancoOrigen("");
      setShowPagoModal(true);`, `setReferencia("");
      setBancoOrigen("");
      setFechaPago(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setShowPagoModal(true);`);

// Modificar llamada a registrarPagoProveedor
code = code.replace(`const res = await registrarPagoProveedor(facturaPagar.id, Number(montoAbonar), metodoPago, referencia, bancoOrigen);`, `const res = await registrarPagoProveedor(facturaPagar.id, Number(montoAbonar), metodoPago, referencia, bancoOrigen, fechaPago ? new Date(fechaPago).toISOString() : undefined);`);

// Añadir fechaPago input y Referencia input in the form
const formRegex = /<div className="grid grid-cols-2 gap-4">[\s\S]*?<\/div>\s*<\/div>\s*<button onClick=\{handlePagar\}/s;

const newForm = `<div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Banco Origen</label>
                    <input type="text" value={bancoOrigen} onChange={(e) => setBancoOrigen(e.target.value)} placeholder="Ej. Banesco" className="w-full bg-neutral-950 border border-neutral-800 text-white py-2 px-3 rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Referencia</label>
                    <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Nro de recibo" className="w-full bg-neutral-950 border border-neutral-800 text-white py-2 px-3 rounded-lg outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Fecha del Pago</label>
                  <input type="datetime-local" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 text-white py-2 px-3 rounded-lg outline-none" />
                </div>
                <button onClick={handlePagar}`;

code = code.replace(formRegex, newForm);
fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', code);
