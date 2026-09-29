const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');
const searchIdx = code.indexOf('w-80 flex flex-col');
if (searchIdx !== -1) {
  console.log(code.substring(searchIdx - 200, searchIdx + 400));
} else {
    // Try to find the flex container that holds the main content and the cart
    const searchIdx2 = code.indexOf('flex h-screen bg-[#0A0A0A] text-neutral-300 font-sans overflow-hidden');
    if (searchIdx2 !== -1) {
        console.log(code.substring(searchIdx2, searchIdx2 + 1000));
    }
}
