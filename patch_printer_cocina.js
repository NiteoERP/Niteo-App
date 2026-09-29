const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', 'utf8');

// 1. Add field to struct
if (!code.includes('TamanoFuenteCocina')) {
  code = code.replace(
    /TamanoFuente\s+int\s+`json:"tamano_fuente_recibo"`/g,
    'TamanoFuente       int    `json:"tamano_fuente_recibo"`\n\tTamanoFuenteCocina int    `json:"tamano_fuente_cocina"`'
  );
  
  // 2. Add to GetPrinterConfig
  code = code.replace(
    /var copias, tamano sql\.NullInt64/,
    'var copias, tamano, tamanoCocina sql.NullInt64'
  );
  
  code = code.replace(
    /IFNULL\(tamano_fuente_recibo, 100\)/g,
    'IFNULL(tamano_fuente_recibo, 100),\n\t\t\tIFNULL(tamano_fuente_cocina, 100)'
  );
  
  code = code.replace(
    /&fuente, &tamano\)/g,
    '&fuente, &tamano, &tamanoCocina)'
  );
  
  code = code.replace(
    /pc\.TamanoFuente = int\(tamano\.Int64\)/,
    'pc.TamanoFuente = int(tamano.Int64)\n\tpc.TamanoFuenteCocina = int(tamanoCocina.Int64)'
  );
  
  // 3. Add to SavePrinterConfig
  code = code.replace(
    /tamano_fuente_recibo = \?/,
    'tamano_fuente_recibo = ?, tamano_fuente_cocina = ?'
  );
  
  code = code.replace(
    /pc\.TamanoFuente\)/g,
    'pc.TamanoFuente, pc.TamanoFuenteCocina)'
  );
  
  fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/printer.go', code);
}
console.log('printer.go patched for TamanoFuenteCocina');
