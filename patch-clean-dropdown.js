const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');

  // Remove the state line
  content = content.replace(/const \[mostrarSugerencias, setMostrarSugerencias\] = useState<string \| null>\(null\);\r?\n/g, '');

  // Remove selectBanco function
  content = content.replace(/const selectBanco = \([\s\S]*?setMostrarSugerencias\(null\);\r?\n\s*\};\r?\n/g, '');

  // Remove the desktop dropdown rendering block safely
  const desktopStart = "{mostrarSugerencias === tx.id && (";
  while (content.includes(desktopStart)) {
    const idx = content.indexOf(desktopStart);
    // Find matching closing tags. We know it ends before </td>
    const endIdx = content.indexOf('</td>', idx);
    content = content.slice(0, idx) + content.slice(endIdx);
  }

  // Remove the mobile dropdown rendering block safely
  const mobileStart = "{mostrarSugerencias === 'mob-' + tx.id && (";
  while (content.includes(mobileStart)) {
    const idx = content.indexOf(mobileStart);
    // Ends before </div>\n                            </div>\n                          </div>
    const endIdx = content.indexOf('</div>\n                            </div>\n                          </div>', idx);
    if (endIdx !== -1) {
       content = content.slice(0, idx) + content.slice(endIdx);
    } else {
       // fallback if carriage returns
       const endIdx2 = content.indexOf('</div>\r\n                            </div>\r\n                          </div>', idx);
       if (endIdx2 !== -1) {
         content = content.slice(0, idx) + content.slice(endIdx2);
       } else {
         break;
       }
    }
  }

  fs.writeFileSync(file, content);
});
