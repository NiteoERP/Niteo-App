const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We replace `.toISOString().split('T')[0]` 
    // with `.toLocaleDateString('sv-SE')` which safely returns YYYY-MM-DD format universally in modern browsers/node.
    // Wait, sv-SE returns YYYY-MM-DD. Or en-CA returns YYYY-MM-DD.
    // Better yet: just write a helper replacement.
    // Actually, `d.toISOString().split('T')[0]` usually looks like:
    // `new Date().toISOString().split('T')[0]`
    // `d.toISOString().split('T')[0]`
    
    // Let's replace any `(SOMEDATE).toISOString().split('T')[0]`
    // with `new Date((SOMEDATE).getTime() - (SOMEDATE).getTimezoneOffset() * 60000).toISOString().split('T')[0]`
    // This is purely string manipulation, it's safer to just replace `.toISOString().split('T')[0]` 
    // Wait, if it's `d.toISOString()`, `d` could be anything.
    
    content = content.replace(/([a-zA-Z0-9_\.\(\)]+)\.toISOString\(\)\.split\('T'\)\[0\]/g, "new Date($1.getTime() - $1.getTimezoneOffset() * 60000).toISOString().split('T')[0]");

    if (content !== original) {
      console.log('Fixed:', filePath);
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
