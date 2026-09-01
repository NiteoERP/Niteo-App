const fs = require('fs');

function cleanFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf-8');
  
  // Remove state
  code = code.replace(/const \[mostrarSugerencias, setMostrarSugerencias\] = useState<string \| null>\(null\);\n/g, '');
  
  // Remove selectBanco function
  code = code.replace(/const selectBanco = \([\s\S]*?setMostrarSugerencias\(null\);\n\s*\};\n/g, '');

  // Desktop view
  // First, find onFocus and onBlur on desktop input
  code = code.replace(/onFocus=\{\(\) => setMostrarSugerencias\(tx\.id\)\}\n\s*onBlur=\{\(\) => setTimeout\(\(\) => setMostrarSugerencias\(null\), 200\)\}/g, 'list="bancos-list"');
  
  // Then find the desktop dropdown
  const desktopDropdownStart = code.indexOf("{mostrarSugerencias === tx.id && (");
  if (desktopDropdownStart !== -1) {
    const desktopDropdownEnd = code.indexOf("</td>", desktopDropdownStart);
    if (desktopDropdownEnd !== -1) {
      code = code.slice(0, desktopDropdownStart) + code.slice(desktopDropdownEnd);
    }
  }

  // Mobile view
  // First, find onFocus and onBlur on mobile input
  code = code.replace(/onFocus=\{\(\) => setMostrarSugerencias\('mob-' \+ tx\.id\)\}\n\s*onBlur=\{\(\) => setTimeout\(\(\) => setMostrarSugerencias\(null\), 200\)\}/g, 'list="bancos-list"');
  
  // Then find the mobile dropdown
  const mobileDropdownStart = code.indexOf("{mostrarSugerencias === 'mob-' + tx.id && (");
  if (mobileDropdownStart !== -1) {
    const searchString = "</div>\n                            </div>\n                          </div>";
    const mobileDropdownEnd = code.indexOf(searchString, mobileDropdownStart);
    if (mobileDropdownEnd !== -1) {
      code = code.slice(0, mobileDropdownStart) + "</div>\n                          </div>";
    }
  }

  fs.writeFileSync(filePath, code);
}

cleanFile('src/app/dashboard/caja/nuevo/page.tsx');
cleanFile('src/app/dashboard/caja/[id]/editar/page.tsx');
