const fs = require('fs');

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

function injectCompression(filePath, handleFnName, isMobile) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Insert helper before handleFnName
  if (!content.includes('const compressImage =')) {
    content = content.replace(
      `const ${handleFnName} = async (e: React.ChangeEvent<HTMLInputElement>) => {`,
      `${compressionHelper}\n  const ${handleFnName} = async (e: React.ChangeEvent<HTMLInputElement>) => {`
    );
  }

  // Find the exact block to replace
  const blockStartStr = `    try {\n      const reader = new FileReader();\n      reader.onloadend = async () => {\n        try {\n          const base64Str = (reader.result as string).split(',')[1];`;
  
  if (content.includes(blockStartStr)) {
    const replacementStr = `    try {\n      const base64Str = await compressImage(file);\n      try {`;
    content = content.replace(blockStartStr, replacementStr);
    
    // Also remove reader.readAsDataURL(file); at the end of the block
    if (isMobile) {
        content = content.replace(
            `        }\n      };\n      reader.readAsDataURL(file);\n    } catch (err) {\n      console.error(err);\n      setIsScanning(false);\n    }`,
            `        }\n      } catch (err) {\n        console.error(err);\n        setIsScanning(false);\n      }`
        );
    } else {
        content = content.replace(
            `        }\n      };\n      reader.readAsDataURL(file);\n    } catch (err) {\n      console.error(err);\n      setIsScanningFac(false);\n    }`,
            `        }\n      } catch (err) {\n        console.error(err);\n        setIsScanningFac(false);\n      }`
        );
    }
    
  } else {
    console.log('Could not find exact block in', filePath);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

injectCompression('src/app/dashboard/proveedores/page.tsx', 'handleScanInvoiceFac', false);
injectCompression('src/components/compras/MobileCompraForm.tsx', 'handleScanInvoice', true);
console.log('Injected compression 2');