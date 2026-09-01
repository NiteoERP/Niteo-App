const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');

  // We can just remove anything starting from {mostrarSugerencias === 'mob-' + tx.id && (
  // up to and including the closing )} right before </div>\n                            </div>\n                          </div>
  
  const startStr = "{mostrarSugerencias === 'mob-' + tx.id && (";
  while (content.includes(startStr)) {
    const idx = content.indexOf(startStr);
    const endDivIdx = content.indexOf('</div>', idx);
    const endBracketIdx = content.indexOf(')}', endDivIdx);
    
    // We slice out from idx to endBracketIdx + 2
    content = content.slice(0, idx) + content.slice(endBracketIdx + 2);
  }

  fs.writeFileSync(file, content);
});
