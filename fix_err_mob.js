const fs = require('fs');
const file = 'src/components/compras/MobileCompraForm.tsx';
let content = fs.readFileSync(file, 'utf8');

let parts = content.split('reader.onloadend = async () => {');
if (parts.length > 1) {
    let secondPart = parts[1];
    
    let newSecondPart = '\n        try {' + secondPart;
    
    newSecondPart = newSecondPart.replace(/setIsScanning\(false\);[\s\S]*?reader\.readAsDataURL\(file\);/, 
    `} catch (errInner) {
          console.error('Error IA:', errInner);
          alert('Hubo un problema de conexión con la IA. Es posible que el servidor esté saturado (Rate Limit). Intenta de nuevo en un minuto.');
        } finally {
          setIsScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (fileInputRefCam.current) fileInputRefCam.current.value = '';
        }
      };
      reader.readAsDataURL(file);`);
      
    content = parts[0] + 'reader.onloadend = async () => {' + newSecondPart;
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed MobileCompraForm.tsx');
} else {
    console.log('Target not found in MobileCompraForm.tsx');
}