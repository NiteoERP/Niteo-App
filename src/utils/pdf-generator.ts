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
  // 80mm de ancho. El alto es dinámico, calculamos uno base seguro.
  // 1 mm = 2.83465 pt. 80mm = ~226 pt.
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200] // 80mm x 200mm base, se puede ajustar
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
  addCenteredText(`Fecha: ${format(new Date(factura.fecha_venta), 'dd/MM/yyyy HH:mm')}`, yPos, 8);
  yPos += 4;
  addCenteredText(`Ticket: ${factura.numero_documento}`, yPos, 8);
  yPos += 6;

  // Cliente y Vendedor
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (factura.cliente_nombre || factura.cliente_id) {
    doc.text(`Cliente: ${factura.cliente_nombre || 'Registrado'}`, margin, yPos);
    yPos += 4;
  }
  if (factura.mesero_nombre) {
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
  items.forEach((item) => {
    // Nombre multilinea si es largo
    const splitName = doc.splitTextToSize(item.nombre || 'Producto', 35);
    doc.text(`${item.cantidad}`, margin, yPos);
    doc.text(splitName, margin + 10, yPos);
    doc.text(`$${(item.precio_unitario * item.cantidad).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += (splitName.length * 3) + 2;
  });

  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Totales
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL USD:', margin, yPos);
  doc.text(`$${Number(factura.total).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TASA:', margin, yPos);
  doc.text(`Bs ${tasa.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 4;
  doc.text('EQUIVALENTE:', margin, yPos);
  doc.text(`Bs ${(Number(factura.total) * tasa).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 6;

  // Pagos
  if (pagos && pagos.length > 0) {
    doc.text('MÉTODOS DE PAGO:', margin, yPos);
    yPos += 4;
    pagos.forEach(p => {
       doc.text(p.tipo_pago, margin, yPos);
       doc.text(`$${Number(p.monto).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
       yPos += 4;
    });
  }

  if (Number(factura.saldo_pendiente) > 0) {
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

  // Recortar página al alto real (un poco más largo para la guillotina)
  // No hay un API directa simple en jsPDF para recortar después de crear,
  // pero el navegador la imprime ajustada en modo thermal usualmente si se guarda.
  // Abriremos en nueva pestaña.
  
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
  const tableData = items.map(item => [
    item.cantidad,
    item.nombre || item.producto_id,
    `$${Number(item.precio_unitario).toFixed(2)}`,
    `$${Number(item.descuento || 0).toFixed(2)}`,
    `$${(Number(item.cantidad) * Number(item.precio_unitario) - Number(item.descuento || 0)).toFixed(2)}`
  ]);

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
