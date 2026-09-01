const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf-8');

  // Import getMetodosHistorialSede
  code = code.replace(
    /import \{ getCierrePrevio, (guardarCierre|actualizarCierre), getBancosUtilizados \} from '@\/actions\/cierres-actions';/,
    `import { getCierrePrevio, $1, getBancosUtilizados, getMetodosHistorialSede } from '@/actions/cierres-actions';`
  );

  // Update loadInitial inside useEffect
  code = code.replace(
    /const \[cierreRes, bancosRes\] = await Promise\.all\(\[\n\s*getCierrePrevio\(today, initialSedeId\),\n\s*getBancosUtilizados\(\)\n\s*\]\);/,
    `const [cierreRes, bancosRes, customMetodos] = await Promise.all([
          getCierrePrevio(today, initialSedeId),
          getBancosUtilizados(),
          initialSedeId ? getMetodosHistorialSede(initialSedeId) : Promise.resolve([])
        ]);`
  );
  
  // Update handleSedeChange where it fetches cierreRes
  code = code.replace(
    /const cierreRes = await getCierrePrevio\(today, newSedeId\);/g,
    `const [cierreRes, customMetodos] = await Promise.all([
        getCierrePrevio(today, newSedeId),
        getMetodosHistorialSede(newSedeId)
      ]);`
  );

  // Add the state update for customMetodos
  code = code.replace(
    /setBancosSugeridos\(bancosRes\);/g,
    `setBancosSugeridos(bancosRes);
        if (customMetodos && customMetodos.length > 0) {
          const restoredMetodos = customMetodos.map((mName: string) => ({
            id: mName,
            color: 'border-indigo-500/30',
            defaultMoneda: 'VES',
            isCustom: true,
            iconKey: 'GripHorizontal'
          }));
          
          setMetodos(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newMets = restoredMetodos.filter((r: any) => !existingIds.has(r.id));
            return [...prev, ...newMets];
          });
        }`
  );

  fs.writeFileSync(file, code);
}

patchFile('src/app/dashboard/caja/[id]/editar/page.tsx');
