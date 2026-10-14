const fs = require('fs');
const buf = fs.readFileSync('C:\\Users\\Usuario\\Documents\\Data\\Scompuesto.dat');

function findRecords(codC, codP) {
  const records = [];
  for (let i = 0; i < buf.length - 168; i++) {
    if (buf.subarray(i, i + 8).toString('ascii') === codC && buf.subarray(i + 32, i + 40).toString('ascii') === codP) {
      records.push({ offset: i, chunk: buf.subarray(i, i + 168) });
    }
  }
  return records;
}

const peq = findRecords('00000032', '00000001')[0];
const med = findRecords('00000042', '00000001')[0];
const fam = findRecords('00000043', '00000001')[0];

console.log('Pequeña offset:', peq?.offset);
console.log('Mediana offset:', med?.offset);
console.log('Familiar offset:', fam?.offset);

if (peq && med && fam) {
  console.log('\n--- BYTE DIFFERENCES ---');
  for (let b = 64; b < 168; b++) {
    const vPeq = peq.chunk[b];
    const vMed = med.chunk[b];
    const vFam = fam.chunk[b];
    if (vPeq !== vMed || vMed !== vFam) {
      console.log(`Byte +${b}: Pequeña=${vPeq.toString(16).padStart(2, '0')}, Mediana=${vMed.toString(16).padStart(2, '0')}, Familiar=${vFam.toString(16).padStart(2, '0')}`);
    }
  }
}
