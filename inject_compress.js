const fs = require('fs');

function injectCompression(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const compressionHelper = `
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };
`;

  // For proveedores/page.tsx
  if (filePath.includes('proveedores/page.tsx')) {
    if (!content.includes('const compressImage =')) {
      content = content.replace(
        'const handleScanInvoiceFac = async (e: React.ChangeEvent<HTMLInputElement>) => {',
        compressionHelper + '\n  const handleScanInvoiceFac = async (e: React.ChangeEvent<HTMLInputElement>) => {'
      );
    }
    
    let parts = content.split('const reader = new FileReader();');
    if(parts.length > 1) {
        let after = parts[1];
        let subparts = after.split('reader.readAsDataURL(file);');
        let body = subparts[0];
        
        // Find the start of try { inside onloadend
        let innerBodyParts = body.split('try {');
        let tryContent = innerBodyParts.slice(1).join('try {');
        // remove the base64 split
        tryContent = tryContent.replace(/const base64Str =.*?;\n/, '');
        
        let newBody = `
        const base64Str = await compressImage(file);
        try {
${tryContent}`;
        content = parts[0] + newBody + subparts.slice(1).join('reader.readAsDataURL(file);');
    }
  }

  // For MobileCompraForm.tsx
  if (filePath.includes('MobileCompraForm.tsx')) {
    if (!content.includes('const compressImage =')) {
      content = content.replace(
        'const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {',
        compressionHelper + '\n  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {'
      );
    }
    let parts = content.split('const reader = new FileReader();');
    if(parts.length > 1) {
        let after = parts[1];
        let subparts = after.split('reader.readAsDataURL(file);');
        let body = subparts[0];
        
        // Find the start of try { inside onloadend
        let innerBodyParts = body.split('try {');
        let tryContent = innerBodyParts.slice(1).join('try {');
        // remove the base64 split
        tryContent = tryContent.replace(/const base64Str =.*?;\n/, '');
        
        let newBody = `
        const base64Str = await compressImage(file);
        try {
${tryContent}`;
        content = parts[0] + newBody + subparts.slice(1).join('reader.readAsDataURL(file);');
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

injectCompression('src/app/dashboard/proveedores/page.tsx');
injectCompression('src/components/compras/MobileCompraForm.tsx');
console.log('Injected compression');