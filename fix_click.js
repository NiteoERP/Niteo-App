const fs = require('fs');

let c = fs.readFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', 'utf8');

// 1. Desktop TR
const desktopTr = `<tr key={p.id} className="hover:bg-neutral-800/20 transition-colors">`;
const newDesktopTr = `<tr key={p.id} className="hover:bg-neutral-800/40 transition-colors cursor-pointer" onClick={() => handleEdit(p)}>`;
c = c.replace(desktopTr, newDesktopTr);

// 2. Mobile DIV
const mobileDiv = `<div key={p.id} className="p-4 hover:bg-neutral-800/20 transition-colors flex flex-col gap-3">`;
const newMobileDiv = `<div key={p.id} className="p-4 hover:bg-neutral-800/40 transition-colors flex flex-col gap-3 cursor-pointer" onClick={() => handleEdit(p)}>`;
c = c.replace(mobileDiv, newMobileDiv);

// 3. Stop propagation on buttons
c = c.replace(/onClick=\{\(\) => handleDelete\(p\.id\)\}/g, "onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}");
c = c.replace(/onClick=\{\(\) => handleEdit\(p\)\}/g, "onClick={(e) => { e.stopPropagation(); handleEdit(p); }}");

fs.writeFileSync('src/app/dashboard/catalogo/CatalogoClient.tsx', c, 'utf8');
console.log('Fixed clicking');
