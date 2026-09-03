const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');

if (!code.includes('startOfDay') || !code.includes('endOfDay')) {
  // Add it if it wasn't there
} else {
  // It is there in the file, but maybe not in the import!
  if (!code.match(/import\s+\{.*startOfDay.*\}\s+from\s+"date-fns"/)) {
    code = code.replace(
      /import \{\s*format,\s*startOfYear\s*\}\s*from\s*"date-fns";/,
      `import { format, startOfYear, startOfDay, endOfDay } from "date-fns";`
    );
  }
}

fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
