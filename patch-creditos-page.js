const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');

// Add states for fechaPago and referencia
const stateTarget = `const [montoAbonar, setMontoAbonar] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [metodosDisponibles, setMetodosDisponibles] = useState<string[]>([]);
  const [isPagarLoading, setIsPagarLoading] = useState(false);`;

const stateReplacement = `const [montoAbonar, setMontoAbonar] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [fechaPago, setFechaPago] = useState("");
  const [metodosDisponibles, setMetodosDisponibles] = useState<string[]>([]);
  const [isPagarLoading, setIsPagarLoading] = useState(false);`;

code = code.replace(stateTarget, stateReplacement);

// Reset states on open global modal
const openGlobalTarget = `setShowPagoGlobalModal(true);
  };`;

const openGlobalReplacement = `setReferencia("");
    setFechaPago(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setShowPagoGlobalModal(true);
  };`;
code = code.replace(openGlobalTarget, openGlobalReplacement);

// Reset states on open modal
const openModalTarget = `setShowPagoModal(true);
  };`;

const openModalReplacement = `setReferencia("");
    setFechaPago(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setShowPagoModal(true);
  };`;
code = code.replace(openModalTarget, openModalReplacement);

// handlePagarGlobal dispatch
const globalDispatchTarget = `const res = await registrarAbonoGlobal(clienteSeleccionado.id_cliente, sedeId, Number(montoAbonarGlobal), metodoPago);`;
const globalDispatchReplacement = `const res = await registrarAbonoGlobal(clienteSeleccionado.id_cliente, sedeId, Number(montoAbonarGlobal), metodoPago, fechaPago ? new Date(fechaPago).toISOString() : undefined, referencia);`;
code = code.replace(globalDispatchTarget, globalDispatchReplacement);

// handlePagar dispatch
const dispatchTarget = `const res = await registrarAbono(facturaPagar.id_factura, Number(montoAbonar), metodoPago);`;
const dispatchReplacement = `const res = await registrarAbono(facturaPagar.id_factura, Number(montoAbonar), metodoPago, fechaPago ? new Date(fechaPago).toISOString() : undefined, referencia);`;
code = code.replace(dispatchTarget, dispatchReplacement);

// Render inputs in PagoGlobalModal
const globalInputsTarget = `<button onClick={handlePagarGlobal} disabled={isPagarLoading}`;
const extraInputs = `<div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Referencia</label>
                    <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Opcional" className="w-full bg-[#0a0a0a] border border-[#262626] focus:border-emerald-500 text-white font-medium py-3 px-4 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Fecha del Pago</label>
                    <input type="datetime-local" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#262626] focus:border-emerald-500 text-white font-medium py-3 px-4 rounded-xl outline-none" />
                  </div>
                </div>
                `;
code = code.replace(globalInputsTarget, extraInputs + globalInputsTarget);

// Render inputs in PagoModal
const modalInputsTarget = `<button onClick={handlePagar} disabled={isPagarLoading}`;
code = code.replace(modalInputsTarget, extraInputs + modalInputsTarget);

fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
