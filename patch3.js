const fs = require('fs');
let p = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

// 1. Add class to all <option> tags
p = p.replace(/<option([^>]*)>/g, '<option$1 className="bg-neutral-900 text-white">');
// Note: Some might already have a class or properties, but the regex covers it.
// Actually, it's safer to just do a simple replace on the exact strings if they don't have classes.
p = p.replace(/<option>/g, '<option className="bg-neutral-900 text-white">');
p = p.replace(/<option value=/g, '<option className="bg-neutral-900 text-white" value=');

// 2. Add custom-scrollbar to the modal
p = p.replace('max-h-[90vh] overflow-y-auto', 'max-h-[90vh] overflow-y-auto custom-scrollbar');

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', p);
console.log('✅ Proveedores page styles patched');
