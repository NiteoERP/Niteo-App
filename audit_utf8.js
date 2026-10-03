const fs = require('fs');
function checkUTF8(file) {
  const buf = fs.readFileSync(file);
  let badBytes = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] > 127) {
      // Check if it's valid UTF-8
      const b = buf[i];
      if (b >= 0xC0 && b <= 0xDF && i+1 < buf.length && (buf[i+1] & 0xC0) === 0x80) { i += 1; continue; }
      if (b >= 0xE0 && b <= 0xEF && i+2 < buf.length && (buf[i+1] & 0xC0) === 0x80 && (buf[i+2] & 0xC0) === 0x80) { i += 2; continue; }
      if (b >= 0xF0 && b <= 0xF7 && i+3 < buf.length && (buf[i+1] & 0xC0) === 0x80 && (buf[i+2] & 0xC0) === 0x80 && (buf[i+3] & 0xC0) === 0x80) { i += 3; continue; }
      badBytes++;
    }
  }
  return badBytes;
}

const files = [
  'src/actions/ai-actions.ts',
  'src/app/dashboard/inventario/InsumosManager.tsx',
  'src/app/dashboard/proveedores/page.tsx',
  'src/components/compras/MobileCompraForm.tsx',
  'src/app/dashboard/delivery/page.tsx',
];

let allGood = true;
for (const f of files) {
  const bad = checkUTF8(f);
  if (bad > 0) { console.log(`❌ BAD: ${f} - ${bad} invalid bytes`); allGood = false; }
  else { console.log(`✅ OK: ${f}`); }
}
if (allGood) console.log('\nAll files are valid UTF-8.');