const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/equipo/AddUserModal.tsx', 'utf-8');
code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-4">/g, '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">');
code = code.replace(/<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">/g, '<div className="flex flex-wrap gap-4">');
fs.writeFileSync('src/app/dashboard/equipo/AddUserModal.tsx', code);
