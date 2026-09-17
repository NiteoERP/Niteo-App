const fs = require('fs');
let fix = fs.readFileSync('fix-calendar.js', 'utf-8');
let content = fs.readFileSync('src/components/pos/HistorialVentas.tsx', 'utf-8');

let calRegex = /const newCalendar = `([\s\S]*?)`;/;
let match = calRegex.exec(fix);

if (match) {
    let calCode = match[1];
    content = content.replace('{/* CALENDAR REMOVED FROM HERE */}', calCode);
    fs.writeFileSync('src/components/pos/HistorialVentas.tsx', content);
    console.log('Replaced.');
} else {
    console.log('No match.');
}
