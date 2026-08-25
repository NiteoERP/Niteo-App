const fs = require('fs');
let file = 'src/app/dashboard/auditoria/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'className={\\px-3 py-1 rounded-full text-xs font-medium \\}', 
  'className={"px-3 py-1 rounded-full text-xs font-medium " + (log.accion === "DELETE" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : log.accion === "UPDATE" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20")}'
);
fs.writeFileSync(file, content);
