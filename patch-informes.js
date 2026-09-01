const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

code = code.replace(
  /const res = await generateReport\(reportId, sedeId, s, e, extra\);/,
  `const res = await generateReport(
        reportId, 
        sedeId, 
        format(startOfDay(s), "yyyy-MM-dd'T'HH:mm:ssXXX"), 
        format(endOfDay(e), "yyyy-MM-dd'T'HH:mm:ssXXX"), 
        extra
      );`
);

// We must also import startOfDay and endOfDay if they are not imported
if (!code.includes('startOfDay') || !code.includes('endOfDay')) {
  code = code.replace(
    /import \{\s*format, subDays, startOfWeek, endOfWeek,/,
    `import {\n  format, subDays, startOfWeek, endOfWeek,\n  startOfDay, endOfDay,`
  );
}

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
