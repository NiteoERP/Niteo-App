const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-web/src/hooks/useInformesData.ts', 'utf8');

const s1 = code.indexOf('export function useGenerateReport');
const s2 = code.indexOf('return { reportData, isGenerating, error, generateReport };');
console.log(code.substring(s1, s2));
