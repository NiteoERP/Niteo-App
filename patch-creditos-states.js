const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');

code = code.replace(`const [metodoPago, setMetodoPago] = useState("Efectivo");
    const [isPagarLoading, setIsPagarLoading] = useState(false);`, `const [metodoPago, setMetodoPago] = useState("Efectivo");
    const [fechaPago, setFechaPago] = useState("");
    const [referencia, setReferencia] = useState("");
    const [isPagarLoading, setIsPagarLoading] = useState(false);`);

code = code.replace(`setShowPagoGlobalModal(true); }}`, `setFechaPago(format(new Date(), "yyyy-MM-dd'T'HH:mm")); setReferencia(""); setShowPagoGlobalModal(true); }}`);
code = code.replace(`setShowPagoModal(true); }}`, `setFechaPago(format(new Date(), "yyyy-MM-dd'T'HH:mm")); setReferencia(""); setShowPagoModal(true); }}`);

fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
