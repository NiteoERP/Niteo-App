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

    // We will replace .toISOString().split('T')[0] 
    // with something safe.
    // Instead of regex capturing, just do a straight replace of `new Date().toISOString().split('T')[0]`
    // to `new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]`
    
    content = content.replaceAll(
      "new Date().toISOString().split('T')[0]",
      "new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]"
    );
    
    // Also replace `d.toISOString().split('T')[0]` which is in Finanzas
    content = content.replaceAll(
      "d.toISOString().split('T')[0]",
      "new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]"
    );
    
    // Also `today.toISOString().split('T')[0]`
    content = content.replaceAll(
      "today.toISOString().split('T')[0]",
      "new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0]"
    );

    if (content !== original) {
      console.log('Fixed:', filePath);
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
