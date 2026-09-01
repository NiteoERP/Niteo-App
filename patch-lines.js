const fs = require('fs');

['src/app/dashboard/caja/nuevo/page.tsx', 'src/app/dashboard/caja/[id]/editar/page.tsx'].forEach(file => {
  let lines = fs.readFileSync(file, 'utf-8').split('\n');
  let newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Remove the state
    if (line.includes('const [mostrarSugerencias')) continue;
    
    // Remove the selectBanco function
    if (line.includes('const selectBanco = (id: string, banco: string) => {')) {
      i += 3; // Skip 4 lines (the function block)
      continue;
    }

    // Replace onFocus and onBlur
    if (line.includes('onFocus={() => setMostrarSugerencias')) {
      newLines.push(line.replace(/onFocus=\{.*\}/, 'list="bancos-list"'));
      continue;
    }
    
    if (line.includes('onBlur={() => setTimeout(() => setMostrarSugerencias(null), 200)}')) {
      continue;
    }

    // Remove the mobile dropdown block
    if (line.includes("{mostrarSugerencias === 'mob-' + tx.id && (")) {
      // Skip until the matching div
      let bracketCount = 1;
      i++;
      while (i < lines.length && bracketCount > 0) {
        if (lines[i].includes('<div')) bracketCount++;
        if (lines[i].includes('</div>')) bracketCount--;
        i++;
      }
      // We also need to skip the closing `)}`
      if (lines[i] && lines[i].includes(')}')) {
         i++;
      }
      i--; // Adjust because the outer loop increments i
      continue;
    }

    newLines.push(line);
  }

  fs.writeFileSync(file, newLines.join('\n'));
});
