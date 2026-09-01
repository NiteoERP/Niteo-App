const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

// Need to import format from date-fns
// wait, format is already imported? Let's assume yes.
// Actually, I can just write my own offset helper or use date-fns format.
// In informes/page.tsx:
// `const res = await generateReport(selectedReport, sedeId, startDate, endDate, extraFilters);`
// Change to:
// `const res = await generateReport(selectedReport, sedeId, format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), extraFilters);`
// But wait, does the client component import startOfDay and endOfDay?
// Yes, it has startOfDay, endOfDay, format etc.

code = code.replace(
  /const res = await generateReport\(selectedReport, sedeId, startDate, endDate, extraFilters\);/,
  `const res = await generateReport(
      selectedReport, 
      sedeId, 
      format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), 
      format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ssXXX"), 
      extraFilters
    );`
);

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
