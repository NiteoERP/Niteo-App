const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf8');

code = code.replace(
  'export default function ComprasPage() {',
  'import SedeSelector from \"@/components/inventario/SedeSelector\";\nexport default function ComprasClient({ sedes, activeSedeId, profile }: { sedes: any[], activeSedeId: string, profile: any }) {'
);

const headerRegex = /historial<\/p>\s*<\/div>/;
code = code.replace(
  headerRegex,
  'historial</p></div>{profile?.rol === "MASTER" && activeSedeId && (<div className="mt-4 md:mt-0"><SedeSelector sedes={sedes} activeSedeId={activeSedeId} /></div>)}'
);

fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code, 'utf8');
