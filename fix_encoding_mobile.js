const fs = require('fs');
let content = fs.readFileSync('src/components/compras/MobileCompraForm.tsx', 'utf8');

content = content.replace("La tasa de cambio se ajustar a esta fecha automticamente.", "La tasa de cambio se ajustará a esta fecha automáticamente.");
content = content.replace("Cmara", "Cámara");
content = content.replace("Galera", "Galería");

fs.writeFileSync('src/components/compras/MobileCompraForm.tsx', content, 'utf8');