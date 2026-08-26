const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/inventario/InsumosManager.tsx', 'utf8');

if (!code.includes('import * as XLSX')) {
  code = code.replace(/import \{ PackageOpen/, "import * as XLSX from 'xlsx';\nimport { PackageOpen");
}

const csvStart = code.indexOf('const handleExportCSV = () => {');
const csvEnd = code.indexOf('};', csvStart + 100) + 2;

const excelReplacement = \const handleExportExcel = () => {
    const data = optimisticInsumos.map((i, idx) => ({
      '#': idx + 1,
      'Nombre del Insumo': i.nombre,
      'Unidad de Medida': i.unidad_medida,
      'Existencia en Sistema': i.cantidad_actual,
      'Existencia Física Real': '' // Espacio en blanco para rellenar
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-ajustar ancho de columnas básico
    const wscols = [
      { wch: 5 }, // #
      { wch: 40 }, // Nombre
      { wch: 20 }, // Unidad
      { wch: 25 }, // Existencia Sis
      { wch: 25 }  // Existencia Real
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    
    XLSX.writeFile(wb, \\\Inventario_\\\.xlsx\\\);
  };\;

code = code.substring(0, csvStart) + excelReplacement + code.substring(csvEnd);
code = code.replace(/handleExportCSV/g, 'handleExportExcel');

fs.writeFileSync('src/app/dashboard/inventario/InsumosManager.tsx', code, 'utf8');
