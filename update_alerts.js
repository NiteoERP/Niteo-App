const fs = require('fs');

function updateErrorAlerts(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const searchStr = `if (res.error) {\n        alert(res.error);\n      } else if (res.data) {`;
  
  const replaceStr = `if (res.error) {
        const errorStr = res.error.toLowerCase();
        if (errorStr.includes('503') || errorStr.includes('504') || errorStr.includes('timeout') || errorStr.includes('fetch failed') || errorStr.includes('rate limit')) {
          alert('Error al escanear (Saturación o fallo de conexión). Por favor, intente nuevamente.');
        } else {
          alert(res.error);
        }
      } else if (res.data) {`;
      
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(filePath, content, 'utf8');
}

updateErrorAlerts('src/app/dashboard/proveedores/page.tsx');
updateErrorAlerts('src/components/compras/MobileCompraForm.tsx');
console.log('Updated error alerts');