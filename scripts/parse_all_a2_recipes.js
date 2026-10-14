const fs = require('fs');
const path = require('path');

const buf = fs.readFileSync('C:\\Users\\Usuario\\Documents\\Data\\SDetallePartes.dat');
const invBuf = fs.readFileSync('C:\\Users\\Usuario\\Documents\\Data\\Sinventario.dat');

// Build map of Code -> Name from Sinventario.dat
const itemNames = new Map();
for (let i = 0; i < invBuf.length - 80; i++) {
  if (invBuf[i] === 0x01) {
    const code = invBuf.subarray(i + 1, i + 16).toString('ascii').replace(/\x00/g, '').trim();
    if (code.length >= 3 && /^[0-9A-Za-z]+$/.test(code)) {
      if (!itemNames.has(code)) {
        const descRaw = invBuf.subarray(i + 33, i + 80).toString('latin1');
        let desc = '';
        for (let j = 0; j < descRaw.length; j++) {
          const ch = descRaw.charCodeAt(j);
          if (ch === 0 || ch === 1) break;
          desc += descRaw[j];
        }
        itemNames.set(code, desc.trim());
      }
    }
  }
}

console.log(`Cargados ${itemNames.size} nombres de productos desde Sinventario.dat.`);

const recipesByProduct = new Map();

for (let i = 0; i < buf.length - 80; i++) {
  if (buf[i + 31] === 0x01 && buf[i + 63] === 0x01 && buf[i + 72] === 0x01) {
    const prodCode = buf.subarray(i, i + 30).toString('ascii').replace(/\x00/g, '').trim();
    const partCode = buf.subarray(i + 32, i + 62).toString('ascii').replace(/\x00/g, '').trim();

    if (/^[0-9A-Za-z]{3,15}$/.test(prodCode) && /^[0-9A-Za-z]{3,15}$/.test(partCode)) {
      const cantidad = buf.readDoubleLE(i + 64);

      if (!isNaN(cantidad) && isFinite(cantidad) && cantidad > 0 && cantidad < 10000) {
        if (!recipesByProduct.has(prodCode)) {
          recipesByProduct.set(prodCode, new Map());
        }
        // Avoid duplicate parts for same product
        recipesByProduct.get(prodCode).set(partCode, {
          partCode,
          partName: itemNames.get(partCode) || `[Parte ${partCode}]`,
          cantidad
        });
      }
    }
  }
}

console.log(`Encontradas recetas para ${recipesByProduct.size} productos distintos en SDetallePartes.dat.\n`);

let sampleCount = 0;
const parsedOutput = [];

for (const [prodCode, partsMap] of recipesByProduct.entries()) {
  const prodName = itemNames.get(prodCode) || `[Producto ${prodCode}]`;
  const parts = Array.from(partsMap.values());
  parsedOutput.push({
    prodCode,
    prodName,
    ingredientes: parts
  });

  if (++sampleCount <= 15) {
    console.log(`[${prodCode}] ${prodName} (${parts.length} partes):`);
    parts.forEach(p => {
      console.log(`   * ${p.partName}: ${p.cantidad}`);
    });
    console.log('');
  }
}

fs.writeFileSync(path.join(__dirname, 'a2_parsed_recipes.json'), JSON.stringify(parsedOutput, null, 2), 'utf8');
console.log(`Total recetas extraídas y guardadas: ${parsedOutput.length}`);
