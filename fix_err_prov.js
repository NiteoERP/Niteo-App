const fs = require('fs');
const file = 'src/app/dashboard/proveedores/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the reader.onloadend logic
content = content.replace(
  /reader\.onloadend = async \(\) => \{\s+const base64Str = \(reader\.result as string\)\.split\(\',\', 2\)\[1\];/g,
  "reader.onloadend = async () => {\n        try {\n          const base64Str = (reader.result as string).split(',')[1];"
);
// We might not have 'split(',', 2)', it was 'split(',')[1]'. Let's do a broader regex.

// Let's just do it manually with simple string splits to avoid regex traps:
let parts = content.split('reader.onloadend = async () => {');
if (parts.length > 1) {
    let secondPart = parts[1];
    
    // add 'try {'
    let newSecondPart = '\n        try {' + secondPart;
    
    // replace the ending
    let endTarget = `        setIsScanningFac(false);\n        if (fileInputRefFac.current) fileInputRefFac.current.value = '';\n      if (fileInputRefFacCam.current) fileInputRefFacCam.current.value = '';\n      };\n      reader.readAsDataURL(file);`;
    
    // In case the exact spacing differs:
    newSecondPart = newSecondPart.replace(/setIsScanningFac\(false\);[\s\S]*?reader\.readAsDataURL\(file\);/, 
    `} catch (errInner) {
          console.error('Error IA:', errInner);
          alert('Hubo un problema de conexión con la IA. Es posible que el servidor esté saturado (Rate Limit). Intenta de nuevo en un minuto.');
        } finally {
          setIsScanningFac(false);
          if (fileInputRefFac.current) fileInputRefFac.current.value = '';
          if (fileInputRefFacCam.current) fileInputRefFacCam.current.value = '';
        }
      };
      reader.readAsDataURL(file);`);
      
    content = parts[0] + 'reader.onloadend = async () => {' + newSecondPart;
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed proveedores page.tsx');
} else {
    console.log('Target not found in proveedores page.tsx');
}