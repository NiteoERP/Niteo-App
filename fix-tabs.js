const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/compras/ComprasClient.tsx', 'utf-8');
code = code.replace(
  /<div className="flex p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto hide-scrollbar max-w-full">/,
  '<div className="flex flex-wrap gap-2 md:gap-4 p-1 bg-transparent max-w-full">'
);
fs.writeFileSync('src/app/dashboard/compras/ComprasClient.tsx', code);
