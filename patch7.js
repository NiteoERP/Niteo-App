const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/page.tsx', 'utf8');

// Use a wrapper component for the page to use useSearchParams cleanly if we wanted to, but we can also just read window.location.search if we don't want to wrap it in Suspense to avoid build errors.
// Using window.location is MUCH easier and doesn't require Suspense wrappers for next.js!
const search = "const [activeTab, setActiveTab] = useState<'insumos' | 'puntual' | 'factura' | 'historial'>('insumos');";
const replace = "const [activeTab, setActiveTab] = useState<'insumos' | 'puntual' | 'factura' | 'historial'>('insumos');\n  \n  useEffect(() => {\n    const params = new URLSearchParams(window.location.search);\n    const tab = params.get('tab');\n    if (tab === 'factura' || tab === 'insumos' || tab === 'puntual' || tab === 'historial') {\n      setActiveTab(tab);\n    }\n    const prov = params.get('prov');\n    if (prov) {\n      setFactura(f => ({...f, proveedor: prov}));\n    }\n  }, []);";

code = code.replace(search, replace);
fs.writeFileSync('src/app/dashboard/compras/page.tsx', code, 'utf8');
