const fs = require('fs');
const path = require('path');

const FILE_PARTES = 'C:\\Users\\Usuario\\Documents\\Data\\SDetallePartes.dat';
const FILE_COMPUESTO = 'C:\\Users\\Usuario\\Documents\\Data\\Scompuesto.dat';
const FILE_INV = 'C:\\Users\\Usuario\\Documents\\Data\\Sinventario.dat';

function inspectFile(filePath, name) {
  const buf = fs.readFileSync(filePath);
  console.log(`\n=== INSPECTING ${name} (${buf.length} bytes) ===`);
  console.log('First 64 bytes (hex):', buf.subarray(0, 64).toString('hex'));

  // Look for printable ASCII strings (length >= 4)
  const strings = [];
  let current = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b >= 32 && b <= 126) {
      current.push(String.fromCharCode(b));
    } else {
      if (current.length >= 4) {
        strings.push({ offset: i - current.length, str: current.join('') });
      }
      current = [];
    }
  }

  console.log(`Total printable strings: ${strings.length}`);
  console.log('Sample strings (first 30):');
  strings.slice(0, 30).forEach(s => console.log(`  [+${s.offset}] ${s.str}`));
}

inspectFile(FILE_COMPUESTO, 'Scompuesto.dat');
inspectFile(FILE_PARTES, 'SDetallePartes.dat');
