const fs = require('fs');
const files = [
  'src/app/dashboard/caja/nuevo/page.tsx',
  'src/app/dashboard/caja/[id]/editar/page.tsx',
  '../niteo-pos/frontend/src/views/CierresWeb.tsx',
  'src/app/dashboard/caja/page.tsx',
  'src/actions/cierres-actions.ts'
];

const replacements = {
  'ÃƒÂ³': 'ó',
  'ÃƒÂ¡': 'á',
  'ÃƒÂ©': 'é',
  'ÃƒÂ­': 'í',
  'ÃƒÂº': 'ú',
  'ÃƒÂ±': 'ñ',
  'Ã³': 'ó',
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã­': 'í',
  'Ãº': 'ú',
  'Ã‰': 'É',
  'Ã±': 'ñ',
  'â‰ˆ': '≈',
  'â”€': '─',
  'Â¡': '¡',
  'Â¿': '¿',
  'Ã¢â€°Ë†': '≈',
  'VERIFICACIÃ“N FÃ SICA': 'VERIFICACIÓN FÍSICA',
  'VERIFICACIÃƒÂ“N FÃƒÂSICA': 'VERIFICACIÓN FÍSICA',
  'Pago MÃƒÂ³vil': 'Pago Móvil',
  'Pago MÃ³vil': 'Pago Móvil',
  'VERIFICACIÃ\x93N FÃ\x8dSICA': 'VERIFICACIÓN FÍSICA',
  'estÃ¡n': 'están',
  'EdiciÃ³n': 'Edición',
  'AtenciÃ³n': 'Atención',
  'MÃ©todo': 'Método',
  'Ã\x93': 'Ó',
  'Ã\x8d': 'Í',
  'Ã\x89': 'É'
};

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Also fix any mangled `VERIFICACIÓN FÍSICA` variations via regex
    content = content.replace(/VERIFICACI.*N F.*SICA/g, 'VERIFICACIÓN FÍSICA');
    content = content.replace(/Pago M.*vil/g, 'Pago Móvil');
    content = content.replace(/estÃ¡n/g, 'están');
    content = content.replace(/EdiciÃ³n/g, 'Edición');
    content = content.replace(/AtenciÃ³n/g, 'Atención');
    content = content.replace(/MÃ©todo/g, 'Método');
    content = content.replace(/Mótodo/g, 'Método');
    content = content.replace(/¡Atenci.n!/g, '¡Atención!');

    for (const [bad, good] of Object.entries(replacements)) {
      content = content.split(bad).join(good);
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
}
