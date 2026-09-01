const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');

code = code.replace(
  /const resCli = await getClientesConDeuda\(sedeId, startDate, endDate, 1, page \* 20, debouncedSearch\);/g,
  `const resCli = await getClientesConDeuda(sedeId, format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), 1, page * 20, debouncedSearch);`
);

if (!code.includes('startOfDay') || !code.includes('endOfDay')) {
  code = code.replace(
    /import \{\s*format, startOfYear\s*\} from "date-fns";/,
    `import { format, startOfYear, startOfDay, endOfDay } from "date-fns";`
  );
}

fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
