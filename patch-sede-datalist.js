const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');

  // Fix datalist ID to be purely alphanumeric
  code = code.replace(
    /id=\{\`bancos-list-\$\{m\.id\.replace\(\/\\s\+\/g, '-'\)\}\`\}/g,
    "id={`bancos-list-${m.id.replace(/[^a-zA-Z0-9]/g, '')}`}"
  );
  code = code.replace(
    /list=\{\`bancos-list-\$\{metodo\.id\.replace\(\/\\s\+\/g, '-'\)\}\`\}/g,
    "list={`bancos-list-${metodo.id.replace(/[^a-zA-Z0-9]/g, '')}`}"
  );

  // Fix initial Sede ID to remember the last used one
  // Replace: const initialSedeId = sedesData.length > 0 ? sedesData[0].id : undefined;
  code = code.replace(
    /const initialSedeId = sedesData\.length > 0 \? sedesData\[0\]\.id : undefined;/g,
    `const lastSedeId = isClient ? localStorage.getItem('niteo_last_sede') : null;
        let initialSedeId = sedesData.length > 0 ? sedesData[0].id : undefined;
        if (lastSedeId && sedesData.some(s => s.id === lastSedeId)) {
          initialSedeId = lastSedeId;
        }`
  );

  // Inside handleSedeChange, save it to localStorage
  code = code.replace(
    /const handleSedeChange = async \(newSedeId: string\) => \{/g,
    `const handleSedeChange = async (newSedeId: string) => {
      localStorage.setItem('niteo_last_sede', newSedeId);`
  );

  fs.writeFileSync(file, code);
});
