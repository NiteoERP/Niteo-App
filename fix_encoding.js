const fs = require('fs');
const path = require('path');

const replacements = [
  ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'], ['Ã±', 'ñ'],
  ['Ã ', 'Á'], ['Ã‰', 'É'], ['Ã\x8D', 'Í'], ['Ã“', 'Ó'], ['Ãš', 'Ú'], ['Ã‘', 'Ñ'],
  ['ǭ', 'á'], ['Ǹ', 'é'], ['ǧ', 'ú'], ['ǟ', 'í'],
  ['Auditorǟ\'\'a', 'Auditoría'],
  ['Configuracin', 'Configuración'],
  ['sltimos', 'Últimos'],
  ['Mtodo', 'Método'],
  ['Mvil', 'Móvil'],
  ['Informacin', 'Información'],
  ['M\x93VIL', 'MÓVIL'],
  ['EDICI\x93N', 'EDICIÓN'],
  ['S\x93LO', 'SÓLO'],
];

function fixDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      fixDir(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let c = fs.readFileSync(p, 'utf8');
      let orig = c;
      
      for (const [bad, good] of replacements) {
        c = c.split(bad).join(good);
      }
      
      // Some manual overrides
      c = c.replace(/C\uFFFDdigo/g, 'Código')
           .replace(/c\uFFFDdigo/g, 'código')
           .replace(/Cat\uFFFDlogo/g, 'Catálogo')
           .replace(/cat\uFFFDlogo/g, 'catálogo')
           .replace(/Men\uFFFD/g, 'Menú')
           .replace(/A\uFFFDadir/g, 'Añadir')
           .replace(/a\uFFFDadir/g, 'añadir')
           .replace(/versi\uFFFDn/gi, 'versión')
           .replace(/descripci\uFFFDn/gi, 'descripción')
           .replace(/M\uFFFDtodo/g, 'Método')
           .replace(/m\uFFFDtodo/g, 'método')
           .replace(/P\uFFFDgina/g, 'Página')
           .replace(/p\uFFFDgina/g, 'página')
           .replace(/Configuraci\uFFFDn/g, 'Configuración')
           .replace(/Informaci\uFFFDn/g, 'Información')
           .replace(/M\uFFFDoVIL/gi, 'MÓVIL')
           .replace(/M\uFFFDvil/g, 'Móvil')
           .replace(/m\uFFFDvil/g, 'móvil')
           .replace(/\uFFFD/g, 'ó'); // Fallback literal \uFFFD

      if (c !== orig) {
        fs.writeFileSync(p, c, 'utf8');
        console.log('Fixed', p);
      }
    }
  }
}
fixDir('C:/Users/Usuario/Documents/Niteo App/niteo-web/src');
