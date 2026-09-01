const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/page.tsx', 'utf-8');

code = code.replace(
  /export default async function CajaPage\(\{ searchParams \}: \{ searchParams: \{ sede\?: string \} \}\) \{/,
  `export default async function CajaPage(props: { searchParams: Promise<{ sede?: string }> }) {\n  const searchParams = await props.searchParams;`
);

fs.writeFileSync('src/app/dashboard/caja/page.tsx', code);
