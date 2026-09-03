const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');

if (!code.includes('registrarAbonoGlobal')) {
  code = code.replace(
    /import \{ getClientesConDeuda, getDetalleDeudaCliente, registrarAbono, getMetodosPago \} from .@\/actions\/creditos-actions.;/,
    'import { getClientesConDeuda, getDetalleDeudaCliente, registrarAbono, getMetodosPago, registrarAbonoGlobal } from "@/actions/creditos-actions";'
  );
}

// Add state for global modal
code = code.replace(
  /const \[isPagarLoading, setIsPagarLoading\] = useState\(false\);/,
  `const [isPagarLoading, setIsPagarLoading] = useState(false);
  const [showPagoGlobalModal, setShowPagoGlobalModal] = useState(false);
  const [montoAbonarGlobal, setMontoAbonarGlobal] = useState("");`
);

// Add handlePagarGlobal
code = code.replace(
  /const handlePagar = async \(\) => \{/,
  `const handlePagarGlobal = async () => {
    if (!clienteSeleccionado || !montoAbonarGlobal) return;
    setIsPagarLoading(true);
    const res = await registrarAbonoGlobal(clienteSeleccionado.id_cliente, sedeId, Number(montoAbonarGlobal), metodoPago);
    if (res.success) {
      setShowPagoGlobalModal(false);
      await fetchDetalle(selectedClienteId);
      const resCli = await getClientesConDeuda(sedeId, startDate, endDate, 1, page * 20, debouncedSearch);
      if (resCli.success) {
        setClientes(resCli.data || []);
        setTotalCount(resCli.totalCount || 0);
      }
      setMontoAbonarGlobal("");
      alert(\`Abono de \${montoAbonarGlobal} USD registrado correctamente. Facturas afectadas: \${res.facturasPagadas}\`);
    } else {
      alert("Error: " + res.error);
    }
    setIsPagarLoading(false);
  };

  const handlePagar = async () => {`
);

// Add button next to Exportar PDF
code = code.replace(
  /<button\n\s*onClick=\{generatePDF\}/,
  `<button
                  onClick={() => { setMontoAbonarGlobal(clienteSeleccionado?.monto_adeudado?.toString() || "0"); setShowPagoGlobalModal(true); }}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-colors text-sm"
                >
                  <Wallet size={16} /> Saldar Total
                </button>
                <button
                  onClick={generatePDF}`
);

// Add Modal block
code = code.replace(
  /\{showPagoModal && facturaPagar && \(/,
  `{showPagoGlobalModal && clienteSeleccionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowPagoGlobalModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Wallet className="text-emerald-400" /> Abonar a Deuda Total</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Monto a Abonar ($)</label>
                <input 
                  type="number" 
                  value={montoAbonarGlobal} 
                  onChange={(e) => setMontoAbonarGlobal(e.target.value)} 
                  max={clienteSeleccionado.monto_adeudado}
                  className="w-full bg-neutral-950 border border-emerald-500/30 focus:border-emerald-500 text-emerald-400 font-black text-xl py-3 px-4 rounded-xl outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase block mb-1">Método de Pago</label>
                <select 
                  value={metodoPago} 
                  onChange={(e) => setMetodoPago(e.target.value)} 
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-600 text-white font-medium py-3 px-4 rounded-xl outline-none appearance-none"
                >
                  {metodosDisponibles.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handlePagarGlobal}
                disabled={isPagarLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 transition-colors"
              >
                {isPagarLoading ? "Procesando..." : "Confirmar Abono Global"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPagoModal && facturaPagar && (`
);

fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
