const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');

code = code.replace(
  /startDate,\s*endDate,/g,
  `format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ssXXX"),`
);

fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
