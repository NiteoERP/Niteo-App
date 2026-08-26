const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/ventas/page.tsx', 'utf8');

const regex = /<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">([\s\S]*?)\{\/\* Tabs Navigation \*\/\}/;
const match = code.match(regex);

if (match) {
  let newBlock = `<div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
${match[1]}
        </div>
        {/* Tabs Navigation */}`;
  
  code = code.replace(regex, newBlock);

  // Now we need to balance the divs. 
  // The original had ONE closing div before {/* Tab Content */} for the 'flex flex-col md:flex-row...' container.
  // We added a wrapper `<div className="flex flex-col gap-4">`, and closed the inner one.
  // So the original closing div will now close our wrapper.
  // Therefore, the div balance remains CORRECT!

  fs.writeFileSync('src/app/dashboard/ventas/page.tsx', code, 'utf8');
  console.log("Patched layout successfully");
} else {
  console.log("Failed to match regex");
}
