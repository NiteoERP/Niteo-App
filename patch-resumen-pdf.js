const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/resumen/page.tsx', 'utf-8');

const exportPDFBlock = `const exportPDF = () => {
    if (data.length === 0) return;
    
    const doc = new jsPDF('landscape');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text('NITEO ERP', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(10, 10, 10);
    doc.text('Reporte de Resumen de Pagos', 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(\`Desde: \${fechaInicio}  |  Hasta: \${fechaFin}\`, 14, 36);
    doc.text(\`Generado el: \${new Date().toLocaleString()}\`, 14, 42);
    
    const head = [['FECHA', 'TOTAL USD', ...methods]];
    
    const body = data.map(row => {
      const rowData = [
        new Date(row.fecha + 'T12:00:00Z').toLocaleDateString('es-VE'),
        \`$\${row.total_usd.toFixed(2)}\`
      ];
      methods.forEach(m => {
        rowData.push(row.metodos[m] ? \`$\${row.metodos[m].toFixed(2)}\` : '-');
      });
      return rowData;
    });
    
    const foot = [['TOTALES', \`$\${grandTotal.toFixed(2)}\`, ...methods.map(m => \`$\${methodTotals[m].toFixed(2)}\`)]];
    
    autoTable(doc, {
      startY: 50,
      head: head,
      body: body,
      foot: foot,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27], textColor: 255 }, // neutral-900
      footStyles: { fillColor: [24, 24, 27], textColor: [52, 211, 153], fontStyle: 'bold' }, // neutral-900 + emerald
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { fontSize: 9 },
    });
    
    doc.save(\`Resumen_Pagos_\${fechaInicio}_\${fechaFin}.pdf\`);
  };`;

code = code.replace(/const exportPDF = \(\) => \{[\s\S]*?doc\.save\(\`Resumen_Pagos_\$\{fechaInicio\}_\$\{fechaFin\}\.pdf\`\);\n  \};/, exportPDFBlock);

fs.writeFileSync('src/app/dashboard/caja/resumen/page.tsx', code);
