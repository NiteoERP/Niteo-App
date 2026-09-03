const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk('src');
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace manual inline formatting
  if (code.includes(`style: 'currency', currency: 'USD'`)) {
    code = code.replace(
      /new Intl\.NumberFormat\('en-US',\s*\{\s*style:\s*'currency',\s*currency:\s*'USD'\s*\}\)\.format\((.*?)\)/g,
      "new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format($1) + ' USD'"
    );
    changed = true;
  }
  
  if (code.includes(`style:"currency",currency:"USD"`)) {
      code = code.replace(
      /new Intl\.NumberFormat\('en-US',\s*\{\s*style:\s*"currency",\s*currency:\s*"USD"\s*\}\)\.format\((.*?)\)/g,
      "new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format($1) + ' USD'"
    );
    changed = true;
  }

  // Also in EmpresaProvider if there is a global one
  if (code.includes(`Intl.NumberFormat('en-US', {`) && code.includes(`currency: 'USD'`)) {
    // A bit risky to regex all, let's just do it manually if we missed something, but the above regex is good.
  }

  if (changed) {
    fs.writeFileSync(file, code, 'utf8');
  }
}
