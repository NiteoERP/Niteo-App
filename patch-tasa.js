const fs = require('fs');
let code = fs.readFileSync('src/actions/config-actions.ts', 'utf-8');

if (!code.includes('unstable_noStore')) {
  code = code.replace(
    `import { revalidatePath } from 'next/cache';`,
    `import { revalidatePath, unstable_noStore as noStore } from 'next/cache';`
  );
}

code = code.replace(
  `export async function getTasaBcvAction() {`,
  `export async function getTasaBcvAction() {\n  noStore();`
);

fs.writeFileSync('src/actions/config-actions.ts', code);
console.log('Patched config-actions.ts');
