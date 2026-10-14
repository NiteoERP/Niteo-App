const fs = require('fs');
const buf = fs.readFileSync('C:\\Users\\Usuario\\Documents\\Data\\SDetallePartes.dat');

const chunk = buf.subarray(226862, 226862 + 256);
console.log('Hex:', chunk.subarray(0, 120).toString('hex'));

for (let i = 0; i < 150; i += 4) {
  const dbl = i + 8 <= chunk.length ? chunk.readDoubleLE(i) : 0;
  const flt = chunk.readFloatLE(i);
  const int = chunk.readInt32LE(i);
  if (!isNaN(dbl) && isFinite(dbl) && dbl > 0.001 && dbl < 1000) {
    console.log(`+${i} dbl: ${dbl}`);
  }
  if (!isNaN(flt) && isFinite(flt) && flt > 0.001 && flt < 1000) {
    console.log(`+${i} flt: ${flt}`);
  }
  if (int > 0 && int < 1000) {
    console.log(`+${i} int: ${int}`);
  }
}
