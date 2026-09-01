const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  code = code.replace(
    /const cierreRes = await getCierrePrevio\(today, newSedeId\);/g,
    `const [cierreRes, customMetodos] = await Promise.all([
          getCierrePrevio(today, newSedeId),
          getMetodosHistorialSede(newSedeId)
        ]);
        if (customMetodos && customMetodos.length > 0) {
          const restoredMetodos = customMetodos.map((mName: string) => ({
            id: mName,
            color: 'border-indigo-500/30',
            defaultMoneda: 'VES',
            isCustom: true,
            iconKey: 'GripHorizontal'
          }));
          
          setMetodos((prev: any[]) => {
            const existingIds = new Set(prev.map(p => p.id));
            const newMets = restoredMetodos.filter((r: any) => !existingIds.has(r.id));
            return [...prev, ...newMets];
          });
        }`
  );

  fs.writeFileSync(file, code);
});
