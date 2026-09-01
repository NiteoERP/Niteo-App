const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  code = code.replace(
    /isCustom: true,\n\s*iconKey: 'GripHorizontal'\n\s*\}\)\);/g,
    `isCustom: true,
            iconKey: 'GripHorizontal',
            icon: GripHorizontal
          }));`
  );

  fs.writeFileSync(file, code);
});
