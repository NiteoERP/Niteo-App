const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', 'utf8');

code = code.replace(
  /func getPaperMetrics\(pc PrinterConfig\) \(lineWidth int, leftMarginDots int, topLines int, bottomLines int, useFontB bool\) \{/g,
  `func getPaperMetrics(pc PrinterConfig, isCocina bool) (lineWidth int, leftMarginDots int, topLines int, bottomLines int, useFontB bool) {`
);

code = code.replace(
  `tamano := pc.TamanoFuente
	if tamano == 0 {`,
  `tamano := pc.TamanoFuente
	if isCocina {
		tamano = pc.TamanoFuenteCocina
	}
	if tamano == 0 {`
);

code = code.replace(
  /lineWidth, leftMarginDots, topLines, bottomLines, useFontB := getPaperMetrics\(pc\)/g,
  'lineWidth, leftMarginDots, topLines, bottomLines, useFontB := getPaperMetrics(pc, false)'
);

// Manually fix ImprimirComandaRaw and ImprimirComandaRawRonda to use isCocina = true
code = code.replace(
  /func \(a \*App\) ImprimirComandaRaw[\s\S]*?getPaperMetrics\(pc, false\)/g,
  (match) => match.replace('getPaperMetrics(pc, false)', 'getPaperMetrics(pc, true)')
);
code = code.replace(
  /func \(a \*App\) ImprimirComandaRawRonda[\s\S]*?getPaperMetrics\(pc, false\)/g,
  (match) => match.replace('getPaperMetrics(pc, false)', 'getPaperMetrics(pc, true)')
);


fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', code);
console.log('printer.go getPaperMetrics patched');
