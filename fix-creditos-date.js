const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf-8');
code = code.replace(
  /const \[startDate, setStartDate\] = useState<Date>\(startOfYear\(new Date\(\)\)\);/,
  "const [startDate, setStartDate] = useState<Date>(new Date('2020-01-01'));"
);
fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code);
