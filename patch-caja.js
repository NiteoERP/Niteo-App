const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/caja/page.tsx', 'utf-8');

// Fix the \ signs
code = code.replace(
  /<p className="text-lg font-black text-neutral-300">\\<\/p>/g,
  '<p className="text-lg font-black text-neutral-300">${Number(c.total_esperado_usd).toFixed(2)}</p>'
);
code = code.replace(
  /<p className="text-lg font-black text-white">\\<\/p>/g,
  '<p className="text-lg font-black text-white">${Number(c.total_fisico_usd).toFixed(2)}</p>'
);

// Add the Edit and Details buttons
// Let's replace the footer of the card to include actions
code = code.replace(
  /<\/div>\s*<\/div>\s*\)\)\s*\)\}/g,
  `
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-neutral-800">
              <Link href={\`/dashboard/caja/\${c.id}\`} className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors">Ver Detalles</Link>
              <Link href={\`/dashboard/caja/\${c.id}/editar\`} className="px-3 py-1.5 text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors">Editar</Link>
            </div>
          </div>
        </div>
      ))
    )}`
);

fs.writeFileSync('src/app/dashboard/caja/page.tsx', code);
