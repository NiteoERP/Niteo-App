const fs = require('fs');

const buf = fs.readFileSync('C:\\Users\\Usuario\\Documents\\Data\\Scompuesto.dat');
console.log('Total file size:', buf.length);

// Record starts around 10522 or earlier. Let's find where the data starts:
const RECORD_SIZE = 168;

for (let i = 0; i < 5; i++) {
  const start = 10522 + i * RECORD_SIZE;
  const chunk = buf.subarray(start, start + RECORD_SIZE);
  console.log(`\n--- RECORD ${i} (Offset ${start}) ---`);
  console.log('Hex:', chunk.subarray(0, 80).toString('hex'));

  // Let's decode strings and numbers
  // Field 1: FC_CODIGOC (0..32)
  const codC = chunk.subarray(0, 32).toString('latin1').replace(/\x00/g, '').trim();
  // Field 2: FC_CODIGOP (32..64)
  const codP = chunk.subarray(32, 64).toString('latin1').replace(/\x00/g, '').trim();

  // Search for doubles in the rest of the record
  console.log(`CodigoCompuesto: "${codC}", CodigoParte: "${codP}"`);
  for (let offset = 64; offset <= RECORD_SIZE - 8; offset += 4) {
    const d = chunk.readDoubleLE(offset);
    if (!isNaN(d) && isFinite(d) && d > 0 && d < 100000) {
      console.log(`  Double at +${offset}: ${d}`);
    }
  }
}
