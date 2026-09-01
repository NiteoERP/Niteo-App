const fs = require('fs');
let code = fs.readFileSync('src/actions/informes-actions.ts', 'utf-8');

// Change function signature
code = code.replace(
  /startDate:\s*Date,\s*endDate:\s*Date,/,
  'startDate: string | Date,\n    endDate:   string | Date,'
);

// Fix the variable assignments
code = code.replace(
  /const p_fecha_inicio = startOfDay\(new Date\(startDate\)\)\.toISOString\(\);/,
  'const p_fecha_inicio = typeof startDate === "string" ? startDate : startOfDay(new Date(startDate)).toISOString();'
);
code = code.replace(
  /const p_fecha_fin    = endOfDay\(new Date\(endDate\)\)\.toISOString\(\);/,
  'const p_fecha_fin    = typeof endDate === "string" ? endDate : endOfDay(new Date(endDate)).toISOString();'
);

fs.writeFileSync('src/actions/informes-actions.ts', code);
