const fs = require('fs');
let code = fs.readFileSync('src/actions/compras-actions.ts', 'utf-8');

if (!code.includes('unstable_noStore')) {
  code = code.replace(
    `import { revalidatePath } from 'next/cache';`,
    `import { revalidatePath, unstable_noStore as noStore } from 'next/cache';`
  );
}

code = code.replace(
  `export async function getTasaDelDia(): Promise<number> {`,
  `export async function getTasaDelDia(): Promise<number> {\n  noStore();`
);

fs.writeFileSync('src/actions/compras-actions.ts', code);
console.log('Patched compras-actions.ts');
