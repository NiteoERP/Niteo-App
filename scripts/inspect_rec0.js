const fs = require('fs');
const buf = fs.readFileSync('C:\\Users\\Usuario\\Documents\\Data\\Scompuesto.dat');

const rec0 = buf.subarray(10522, 10522 + 168);
console.log('Record length:', rec0.length);
for (let i = 0; i < rec0.length; i += 8) {
  const hex = rec0.subarray(i, i + 8).toString('hex');
  const dbl = i + 8 <= rec0.length ? rec0.readDoubleLE(i) : 0;
  const flt1 = i + 4 <= rec0.length ? rec0.readFloatLE(i) : 0;
  const flt2 = i + 8 <= rec0.length ? rec0.readFloatLE(i + 4) : 0;
  const int32_1 = i + 4 <= rec0.length ? rec0.readInt32LE(i) : 0;
  const int32_2 = i + 8 <= rec0.length ? rec0.readInt32LE(i + 4) : 0;
  const ascii = rec0.subarray(i, i + 8).toString('latin1').replace(/[^\x20-\x7E]/g, '.');
  console.log(`+${i.toString().padStart(3, '0')}: [${hex}] | dbl: ${dbl} | flt: ${flt1}, ${flt2} | int: ${int32_1}, ${int32_2} | str: '${ascii}'`);
}
