const fs = require('fs');
const buf = fs.readFileSync('C:\\Users\\Usuario\\Documents\\Data\\Scompuesto.dat');

for (let i = 0; i < 10500; i++) {
  if (buf.subarray(i, i + 3).toString('ascii') === 'FC_') {
    let end = i;
    while (buf[end] !== 0 && end < i + 30) end++;
    const name = buf.subarray(i, end).toString('ascii');
    const before = buf.subarray(Math.max(0, i - 16), i).toString('hex');
    const after = buf.subarray(end + 1, end + 17).toString('hex');
    console.log(`Field: ${name.padEnd(20)} at +${i.toString().padStart(5, ' ')} | before: ${before} | after: ${after}`);
  }
}
