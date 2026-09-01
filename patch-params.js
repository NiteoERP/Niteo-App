const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/page.tsx', 'utf-8');

code = code.replace(
  /export default async function CierreDetallePage\(\{ params \}: \{ params: \{ id: string \} \}\) \{/,
  `export default async function CierreDetallePage(props: { params: Promise<{ id: string }> }) {\n  const params = await props.params;`
);

fs.writeFileSync('src/app/dashboard/caja/[id]/page.tsx', code);
