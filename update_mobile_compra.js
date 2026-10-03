const fs = require('fs');
let content = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf8');

// Add fechaEmision state
content = content.replace(
  "const [errorMsg, setErrorMsg] = useState('');",
  "const [errorMsg, setErrorMsg] = useState('');\n  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split('T')[0]);"
);

// Update initial rate fetch to use fechaEmision and add dependency
content = content.replace(
  "const [data, tasa] = await Promise.all([getInsumos(), getTasaDelDia()]);",
  "const [data, tasa] = await Promise.all([getInsumos(), getTasaDelDia(fechaEmision)]);"
);

content = content.replace(
  "  }, []);",
  "  }, [fechaEmision]);"
);

// Add fechaEmision to the UI, right above the Moneda row
const fechaUIRegex = /<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-5 mb-4 shadow-xl">[\s\S]*?<div className="grid grid-cols-2 gap-3 mb-4">/;
content = content.replace(
  '<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-5 mb-4 shadow-xl">\n        {/* Proveedor y Moneda */}\n        <div className="grid grid-cols-2 gap-3 mb-4">',
  `<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-5 mb-4 shadow-xl">
        {/* Proveedor, Fecha y Moneda */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Fecha de la Factura</label>
          <input
            type="date"
            value={fechaEmision}
            onChange={(e) => setFechaEmision(e.target.value)}
            className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
          />
          <p className="text-[10px] text-neutral-500 mt-1">La tasa de cambio se ajustar a esta fecha.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">`
);

// We should also replace the  because of Powershell string encoding. We will use a regular string.
content = content.replace('ajustar', 'ajustará');

// Add camera input and button
const inputRegex = /<input\s*type="file"\s*accept="image\/\*"\s*className="hidden"\s*ref=\{fileInputRef\}\s*onChange=\{handleScanInvoice\}\s*\/>/m;
content = content.replace(
  inputRegex,
  `<input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleScanInvoice}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRefCam}
            onChange={handleScanInvoice}
          />`
);

const buttonRegex = /<button\s*onClick=\{.*?fileInputRef\.current\?\.click\(\)\}\s*disabled=\{isScanning\}\s*className="bg-indigo-600\/20 hover:bg-indigo-600\/30 text-indigo-400 border border-indigo-500\/30 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"\s*title="Autocompletar con Foto \(IA\)"\s*>\s*\{isScanning \? <Loader2 size=\{16\} className="animate-spin" \/> : <Camera size=\{16\} \/>\}\s*<span className="hidden sm:inline font-medium text-sm">\s*\{isScanning \? 'Analizando\.\.\.' : 'Escanear Foto'\}\s*<\/span>\s*<\/button>/m;

content = content.replace(
  buttonRegex,
  `<button
            onClick={() => fileInputRefCam.current?.click()}
            disabled={isScanning}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Tomar Foto"
          >
            {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            <span className="hidden sm:inline font-medium text-sm">
              Cámara
            </span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Subir de Galería"
          >
            <span className="hidden sm:inline font-medium text-sm">
              Galería
            </span>
          </button>`
);

// Include fecha_emision in registrarFacturaInsumos
content = content.replace(
  "        const res = await registrarFacturaInsumos({\n          proveedor: proveedor || 'Proveedor General',\n          moneda: monedaGlobal,",
  "        const res = await registrarFacturaInsumos({\n          proveedor: proveedor || 'Proveedor General',\n          fecha_emision: fechaEmision,\n          moneda: monedaGlobal,"
);

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', content, 'utf8');