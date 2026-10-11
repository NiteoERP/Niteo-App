import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Extensión para typescript de jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERADOR DE TICKET POS EXPRESS (Formato Térmico 80mm)
// ─────────────────────────────────────────────────────────────────────────────
export function generarTicketPOS(factura: any, empresa: any, items: any[], pagos: any[], tasa: number) {
  // 80mm de ancho. Calculamos alto dinámico para evitar desperdicio de papel térmico
  let estimatedLines = 0;
  (items || []).forEach((item) => {
    const rawNombre = item.nombre || item.producto_nombre || 'Producto';
    estimatedLines += Math.max(1, Math.ceil(rawNombre.length / 22));
    if (item.combo_items && Array.isArray(item.combo_items)) {
      estimatedLines += item.combo_items.length * 1.2;
    }
  });

  const baseHeader = 50;
  const baseFooter = 55 + ((pagos?.length || 1) * 4.5) + (Number(factura?.saldo_pendiente || 0) > 0 ? 8 : 0);
  const itemsHeight = estimatedLines * 4.5;
  const totalHeight = Math.max(130, Math.ceil(baseHeader + itemsHeight + baseFooter));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeight]
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 10;
  const margin = 5;
  const contentWidth = pageWidth - (margin * 2);

  // Helper centrado
  const addCenteredText = (text: string, y: number, size: number, isBold: boolean = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Cabecera Empresa
  addCenteredText(empresa?.nombre_comercial || 'Niteo POS', yPos, 14, true);
  yPos += 5;

  const fechaVal = factura?.fecha_venta ? new Date(factura.fecha_venta) : new Date();
  const fechaStr = fechaVal.toLocaleString('es-VE', {
    timeZone: 'America/Caracas',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  addCenteredText(`Fecha: ${fechaStr}`, yPos, 8);
  yPos += 4;
  addCenteredText(`Ticket: ${factura?.numero_documento || 'VENTA'}`, yPos, 8);
  yPos += 6;

  // Cliente y Vendedor
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (factura?.cliente_nombre || factura?.cliente_id) {
    doc.text(`Cliente: ${factura.cliente_nombre || 'Registrado'}`, margin, yPos);
    yPos += 4;
  }
  if (factura?.mesero_nombre) {
    doc.text(`Atendido por: ${factura.mesero_nombre}`, margin, yPos);
    yPos += 4;
  }
  yPos += 2;

  // Separador
  (doc as any).setLineDash([1, 1], 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  (doc as any).setLineDash([]); // Reset
  yPos += 5;

  // Encabezados Items
  doc.setFont('helvetica', 'bold');
  doc.text('CANT', margin, yPos);
  doc.text('DESCRIPCION', margin + 10, yPos);
  doc.text('TOTAL', pageWidth - margin, yPos, { align: 'right' });
  yPos += 4;

  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Items
  doc.setFont('helvetica', 'normal');
  (items || []).forEach((item) => {
    let rawNombre = item.nombre || item.producto_nombre || 'Producto';
    const hasComboItems = item.combo_items && Array.isArray(item.combo_items) && item.combo_items.length > 0;
    
    // Si tiene combo_items y el nombre trae resumen concatenado entre paréntesis, lo limpiamos para que el desglose indentado resalte
    if (hasComboItems && rawNombre.includes(' (')) {
      rawNombre = rawNombre.split(' (')[0];
    }

    const splitName = doc.splitTextToSize(rawNombre, 40);
    const cant = Number(item.cantidad || 1);
    const unitPrice = Number(item.precio_unitario || 0);
    const itemTotal = Number(item.total !== undefined ? item.total : (unitPrice * cant));

    doc.text(`${cant}`, margin, yPos);
    doc.text(splitName, margin + 10, yPos);
    doc.text(`$${itemTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += (splitName.length * 3.5) + 1.5;

    // Sub-productos de promociones o combos (cócteles servidos en la barra)
    if (hasComboItems) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      item.combo_items.forEach((sub: any) => {
        const subCant = Number(sub.cantidad || 1);
        const subPrefix = subCant > 1 ? `${subCant}x ` : '';
        const subLine = `  - ${subPrefix}${sub.nombre || 'Sub-producto'}`;
        const splitSub = doc.splitTextToSize(subLine, 45);
        doc.text(splitSub, margin + 10, yPos);
        yPos += (splitSub.length * 2.8) + 1;
      });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      yPos += 1;
    }
  });

  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Totales
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL USD:', margin, yPos);
  doc.text(`$${Number(factura?.total || 0).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TASA:', margin, yPos);
  doc.text(`Bs ${Number(tasa || 1).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 4;
  doc.text('EQUIVALENTE:', margin, yPos);
  doc.text(`Bs ${(Number(factura?.total || 0) * Number(tasa || 1)).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 6;

  // Pagos
  if (pagos && pagos.length > 0) {
    doc.text('MÉTODOS DE PAGO:', margin, yPos);
    yPos += 4;
    pagos.forEach(p => {
       doc.text(p.tipo_pago || 'Pago', margin, yPos);
       doc.text(`$${Number(p.monto || 0).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
       yPos += 4;
    });
  }

  if (Number(factura?.saldo_pendiente || 0) > 0) {
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('PENDIENTE A CRÉDITO:', margin, yPos);
    doc.text(`$${Number(factura.saldo_pendiente).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;
  }

  yPos += 8;
  addCenteredText('¡Gracias por su compra!', yPos, 10, true);
  yPos += 5;
  addCenteredText('Generado por Niteo', yPos, 6, false);

  // Guardado local (blob url) para previsualización e impresión
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. GENERADOR DE DOCUMENTO A4 (Presupuestos / Facturas)
// ─────────────────────────────────────────────────────────────────────────────
export function generarDocumentoA4(factura: any, empresa: any, items: any[], cliente: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pw = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header Empresa
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text(empresa?.nombre_comercial?.toUpperCase() || 'EMPRESA DEMO', 20, yPos);
  
  // Info Documento
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`${factura.tipo_documento === 'PRESUPUESTO' ? 'Presupuesto' : 'Factura'} N°:`, pw - 60, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(factura.numero_documento || '000000', pw - 20, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Fecha:', pw - 60, yPos);
  doc.setTextColor(30, 30, 30);
  doc.text(format(new Date(factura.fecha_venta), 'dd MMM yyyy', { locale: es }), pw - 20, yPos, { align: 'right' });

  if (factura.fecha_vencimiento) {
    yPos += 6;
    doc.setTextColor(100, 100, 100);
    doc.text('Válido hasta:', pw - 60, yPos);
    doc.setTextColor(30, 30, 30);
    doc.text(format(new Date(factura.fecha_vencimiento), 'dd MMM yyyy', { locale: es }), pw - 20, yPos, { align: 'right' });
  }

  yPos += 15;

  // Linea separadora
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pw - 20, yPos);
  yPos += 10;

  // Cliente Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURAR A:', 20, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  if (cliente) {
    doc.text(`Cliente: ${cliente.nombre_comercial || cliente.razon_social || factura.cliente_nombre}`, 20, yPos);
    yPos += 5;
    if (cliente.identificacion) {
       doc.text(`ID/RUT: ${cliente.identificacion}`, 20, yPos);
       yPos += 5;
    }
    if (cliente.email) {
       doc.text(`Email: ${cliente.email}`, 20, yPos);
       yPos += 5;
    }
    if (cliente.telefono) {
       doc.text(`Tlf: ${cliente.telefono}`, 20, yPos);
       yPos += 5;
    }
  } else {
    doc.text(`Cliente: ${factura.cliente_nombre || 'Consumidor Final'}`, 20, yPos);
    yPos += 5;
  }

  yPos += 10;

  // Tabla
  const tableData = items.map(item => {
    let desc = item.nombre || item.producto_nombre || item.producto_id || 'Producto';
    if (item.combo_items && Array.isArray(item.combo_items) && item.combo_items.length > 0) {
      if (desc.includes(' (')) desc = desc.split(' (')[0];
      const subs = item.combo_items.map((s: any) => `  * ${s.cantidad > 1 ? `${s.cantidad}x ` : ''}${s.nombre}`).join('\n');
      desc = `${desc}\n${subs}`;
    }
    const unitPrice = Number(item.precio_unitario || 0);
    const cant = Number(item.cantidad || 1);
    const descMonto = Number(item.descuento || 0);
    const totalLine = Number(item.total !== undefined ? item.total : (cant * unitPrice - descMonto));
    return [
      cant,
      desc,
      `$${unitPrice.toFixed(2)}`,
      `$${descMonto.toFixed(2)}`,
      `$${totalLine.toFixed(2)}`
    ];
  });

  doc.autoTable({
    startY: yPos,
    head: [['CANTIDAD', 'DESCRIPCIÓN', 'PRECIO UNIT.', 'DESC.', 'TOTAL']],
    body: tableData,
    theme: 'plain',
    headStyles: { fillColor: [245, 245, 245], textColor: [80, 80, 80], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4, textColor: [50, 50, 50] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: 20, right: 20 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Totales
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const totalStr = `$${Number(factura.total).toFixed(2)}`;
  doc.text('TOTAL:', pw - 50, yPos);
  doc.text(totalStr, pw - 20, yPos, { align: 'right' });
  
  yPos += 20;

  // Notas y Condiciones
  if (factura.notas) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Notas:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const splitNotas = doc.splitTextToSize(factura.notas, pw - 40);
    doc.text(splitNotas, 20, yPos);
    yPos += splitNotas.length * 4 + 5;
  }

  if (factura.terminos_condiciones) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Términos y Condiciones:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const splitTerms = doc.splitTextToSize(factura.terminos_condiciones, pw - 40);
    doc.text(splitTerms, 20, yPos);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generado a través de Niteo ERP', pw / 2, 280, { align: 'center' });

  doc.save(`${factura.numero_documento}.pdf`);
}
