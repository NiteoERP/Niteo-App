const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  // Fix loadInitial Promise.all
  code = code.replace(
    /const \[cierreRes, bancosRes\] = await Promise\.all\(\[\s*getCierrePrevio\(today, initialSedeId\),\s*getBancosUtilizados\(\)\s*\]\);/,
    `const [cierreRes, bancosRes, customMetodos] = await Promise.all([
          getCierrePrevio(today, initialSedeId),
          getBancosUtilizados(),
          initialSedeId ? getMetodosHistorialSede(initialSedeId) : Promise.resolve([])
        ]);`
  );

  // Fix handleSedeChange where customMetodos is fetched but not used
  // I will just remove it from handleSedeChange for now to avoid TS errors
  code = code.replace(
    /const \[cierreRes, customMetodos\] = await Promise\.all\(\[\s*getCierrePrevio\(today, newSedeId\),\s*getMetodosHistorialSede\(newSedeId\)\s*\]\);/g,
    `const cierreRes = await getCierrePrevio(today, newSedeId);`
  );

  fs.writeFileSync(file, code);
});
