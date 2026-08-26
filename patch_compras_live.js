const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/page.tsx', 'utf8');

if (!code.includes('useLiveTable')) {
  // Add import
  code = code.replace(
    "import { useEmpresa } from '@/components/providers/EmpresaProvider';",
    "import { useEmpresa } from '@/components/providers/EmpresaProvider';\nimport { useLiveTable } from '@/hooks/useLiveTable';"
  );

  // Inject hook call inside the component
  const hookTarget = "const [activeTab, setActiveTab] = useState<'insumos' | 'puntual' | 'factura' | 'historial'>('insumos');";
  const hookCall = \  const [activeTab, setActiveTab] = useState<'insumos' | 'puntual' | 'factura' | 'historial'>('insumos');

  // Actualización en tiempo real desde la BD
  useLiveTable('compras_facturas', () => {
    if (activeTab === 'historial') cargarHistorialCompleto();
    if (activeTab === 'puntual') {
      getUltimasCompras().then(res => {
        if (res.success) setUltimasCompras(res.compras || []);
      });
    }
  });\;
  code = code.replace(hookTarget, hookCall);

  fs.writeFileSync('src/app/dashboard/compras/page.tsx', code, 'utf8');
}
