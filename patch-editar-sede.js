const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', 'utf-8');

// Also remove getCierrePrevio from imports? No, I already did, that's why TS complains.
// Let's rewrite handleSedeChange to just not do anything or remove it.
const emptyHandleSedeChange = `const handleSedeChange = async (newSedeId: string) => {
    // No permitimos cambiar la sede en edición
  };`;

code = code.replace(
  /const handleSedeChange = async \(newSedeId: string\) => \{[\s\S]*?\}\)\;\n        \}\n      \} catch \(err\) \{\n        console\.error\(err\);\n      \}\n      setLoading\(false\);\n    \};/m,
  emptyHandleSedeChange
);

// Fallback in case regex missed it
const handleStart = "const handleSedeChange = async (newSedeId: string) => {";
if (code.includes(handleStart) && !code.includes("No permitimos cambiar la sede")) {
  let idx = code.indexOf(handleStart);
  let endIdx = code.indexOf("setLoading(false);\n    };", idx);
  if (endIdx !== -1) {
    code = code.slice(0, idx) + emptyHandleSedeChange + code.slice(endIdx + "setLoading(false);\n    };".length);
  }
}

// Make the select disabled
code = code.replace(
  /<select\s+value=\{selectedSedeId\}\s+onChange=\{\(e\) => handleSedeChange\(e\.target\.value\)\}/g,
  '<select\n                value={selectedSedeId}\n                disabled\n                onChange={(e) => handleSedeChange(e.target.value)}'
);

fs.writeFileSync('src/app/dashboard/caja/[id]/editar/page.tsx', code);
