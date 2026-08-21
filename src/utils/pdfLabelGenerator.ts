import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { InventoryItem } from '@/src/types';

export type LabelSheetFormat = 'a4_24' | 'a4_40' | 'thermal_50x25' | 'thermal_70x35';

/**
 * Generates a clean Base64 PNG data URL for a given barcode string using JsBarcode
 */
function getBarcodeDataUrl(code: string): string {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code.trim() || 'EL-1', {
      format: 'CODE128',
      width: 2.5,
      height: 60,
      displayValue: false,
      margin: 2,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Failed to generate barcode data URL for PDF:', code, err);
    return '';
  }
}

/**
 * Generates and downloads a multi-page PDF sticker sheet
 */
export async function generatePdfLabelSheet(
  items: InventoryItem[],
  format: LabelSheetFormat = 'a4_24',
  copiesPerItem: number = 1
): Promise<void> {
  if (!items || items.length === 0) return;

  // Flatten items based on copies requested
  const expandedItems: InventoryItem[] = [];
  items.forEach(item => {
    for (let c = 0; c < Math.max(1, copiesPerItem); c++) {
      expandedItems.push(item);
    }
  });

  if (format === 'thermal_50x25') {
    // 50mm x 25mm Single Label Thermal Roll
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [50, 25],
    });

    expandedItems.forEach((item, index) => {
      if (index > 0) doc.addPage([50, 25], 'landscape');

      const code = item.barcode || item.sku || `EL-${item.id}`;
      const barcodeImg = getBarcodeDataUrl(code);
      const location = item.binLocation || 'Rack - Shelf 1';

      // Item Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(item.name.substring(0, 28).toUpperCase(), 25, 4.5, { align: 'center' });

      // Location details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(`LOC: ${location}`, 25, 7.5, { align: 'center' });

      // Large Barcode Image
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', 3, 8.5, 44, 11);
      }

      // Barcode / SKU Text
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.text(code, 25, 23, { align: 'center' });
    });

    doc.save(`thermal_labels_${Date.now()}.pdf`);
    return;
  }

  if (format === 'thermal_70x35') {
    // 70mm x 35mm Large Thermal Label
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [70, 35],
    });

    expandedItems.forEach((item, index) => {
      if (index > 0) doc.addPage([70, 35], 'landscape');

      const code = item.barcode || item.sku || `EL-${item.id}`;
      const barcodeImg = getBarcodeDataUrl(code);
      const location = item.binLocation || 'Rack - Shelf 1';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(item.name.substring(0, 32).toUpperCase(), 35, 6, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`LOCATION: ${location.toUpperCase()}`, 35, 10, { align: 'center' });

      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', 5, 11.5, 60, 16);
      }

      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.text(code, 35, 31.5, { align: 'center' });
    });

    doc.save(`large_thermal_labels_${Date.now()}.pdf`);
    return;
  }

  if (format === 'a4_40') {
    // A4 40-up (4 columns x 10 rows)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const cols = 4;
    const rows = 10;
    const labelWidth = 48.5;
    const labelHeight = 25.4;
    const marginLeft = 8;
    const marginTop = 18;
    const gapX = 2;
    const gapY = 2;
    const labelsPerPage = cols * rows;

    expandedItems.forEach((item, index) => {
      if (index > 0 && index % labelsPerPage === 0) {
        doc.addPage('a4', 'portrait');
      }

      const pageIndex = index % labelsPerPage;
      const col = pageIndex % cols;
      const row = Math.floor(pageIndex / cols);
      const x = marginLeft + col * (labelWidth + gapX);
      const y = marginTop + row * (labelHeight + gapY);

      const code = item.barcode || item.sku || `EL-${item.id}`;
      const barcodeImg = getBarcodeDataUrl(code);
      const location = item.binLocation || 'Rack - Shelf 1';

      // Item Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(item.name.substring(0, 24).toUpperCase(), x + labelWidth / 2, y + 3.8, { align: 'center' });

      // Location details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(`LOC: ${location}`, x + labelWidth / 2, y + 6.8, { align: 'center' });

      // Large Barcode
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', x + 2, y + 7.5, labelWidth - 4, 12);
      }

      // Barcode Text
      doc.setFont('courier', 'bold');
      doc.setFontSize(6.5);
      doc.text(code, x + labelWidth / 2, y + 23.5, { align: 'center' });
    });

    doc.save(`a4_40up_labels_${Date.now()}.pdf`);
    return;
  }

  // Default: A4 24-up (3 columns x 8 rows - Avery 5160 / 70x37mm)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const cols = 3;
  const rows = 8;
  const labelWidth = 63.5;
  const labelHeight = 33.8;
  const marginLeft = 8;
  const marginTop = 12;
  const gapX = 3;
  const gapY = 2;
  const labelsPerPage = cols * rows;

  expandedItems.forEach((item, index) => {
    if (index > 0 && index % labelsPerPage === 0) {
      doc.addPage('a4', 'portrait');
    }

    const pageIndex = index % labelsPerPage;
    const col = pageIndex % cols;
    const row = Math.floor(pageIndex / cols);
    const x = marginLeft + col * (labelWidth + gapX);
    const y = marginTop + row * (labelHeight + gapY);

    const code = item.barcode || item.sku || `EL-${item.id}`;
    const barcodeImg = getBarcodeDataUrl(code);
    const location = item.binLocation || 'Rack - Shelf 1';

    // Label border outline (optional faint guide)
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, y, labelWidth, labelHeight, 2, 2);

    // Item Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(item.name.substring(0, 28).toUpperCase(), x + labelWidth / 2, y + 5, { align: 'center' });

    // Location Detail Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`LOC: ${location.toUpperCase()}`, x + labelWidth / 2, y + 8.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Large Barcode Image
    if (barcodeImg) {
      doc.addImage(barcodeImg, 'PNG', x + 3, y + 9.5, labelWidth - 6, 17);
    }

    // Barcode Text
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.text(code, x + labelWidth / 2, y + 31, { align: 'center' });
  });

  doc.save(`a4_24up_labels_${Date.now()}.pdf`);
}
