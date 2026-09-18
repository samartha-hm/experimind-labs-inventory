import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { DispatchReportSummary, DispatchItem } from './DispatchReportService';

export type PdfDocumentType = 'FULL_DISPATCH' | 'SHORTAGE_CHECKLIST' | 'WAREHOUSE_PICKLIST' | 'SELECTED_ITEMS' | 'LASER_CUTTING' | 'LAB_PREPARATION';
export type PdfOrientation = 'landscape' | 'portrait';

export interface PdfGeneratorOptions {
  documentType?: PdfDocumentType;
  orientation?: PdfOrientation;
  includePrices?: boolean;
  includeNotes?: boolean;
  includeCheckboxes?: boolean;
  includeSignatures?: boolean;
  titleOverride?: string;
  customFilename?: string;
}

interface ColumnLayout {
  header: string;
  width: number;
  align: 'left' | 'center' | 'right';
  x: number;
}

export class DispatchPdfService {
  /**
   * Generates a clean 1D barcode image for the document header
   */
  private static generateBarcode(text: string): string {
    try {
      if (typeof document === 'undefined') return '';
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, text || 'DISP-001', {
        format: 'CODE128',
        width: 2,
        height: 36,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  /**
   * Safe text sanitizer: converts Unicode multi-byte symbols to safe WinAnsi strings
   */
  private static sanitizeText(str: string | number | undefined | null): string {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/₹/g, 'Rs.')
      .replace(/✓/g, '[OK]')
      .replace(/•/g, '-')
      .replace(/[^\x00-\x7F]/g, ''); // strip any non-ascii that would crash default fonts
  }

  /**
   * Master Vector PDF Generator with zero text overlap and rigorous coordinate mapping
   */
  public static createDispatchPdf(
    summary: DispatchReportSummary,
    options: PdfGeneratorOptions = {}
  ): jsPDF {
    const {
      documentType = 'FULL_DISPATCH',
      orientation = documentType === 'FULL_DISPATCH' ? 'landscape' : 'portrait',
      includePrices = true,
      includeNotes = true,
      includeCheckboxes = true,
      includeSignatures = true,
      titleOverride
    } = options;

    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const isLandscape = orientation === 'landscape';
    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    let y = margin;

    // Filter Items by Report Mode
    let itemsToRender: DispatchItem[] = summary.items;
    let reportTitle = titleOverride || 'EXECUTIVE DISPATCH & PRODUCTION READINESS REPORT';
    let reportSubtitle = 'Official Master Bill of Materials • Readiness Breakdown • Sourcing Matrix';

    if (documentType === 'SHORTAGE_CHECKLIST') {
      itemsToRender = summary.items.filter(i => i.deficitQuantity > 0);
      reportTitle = titleOverride || 'PROCUREMENT & SHORTAGE SHOPPING CHECKLIST';
      reportSubtitle = 'Action Required: Materials to Purchase from Local Markets & Vendor POs';
    } else if (documentType === 'WAREHOUSE_PICKLIST') {
      itemsToRender = summary.items.filter(i => i.actionChannel === 'IN_STOCK' || i.actionChannel === 'IN_HOUSE_FABRICATION');
      reportTitle = titleOverride || 'WAREHOUSE STAGING & KITTING PICK LIST';
      reportSubtitle = 'Floor Order: Components to Pick from Storage Bins & Internal Fabrication Workshop';
    } else if (documentType === 'LASER_CUTTING') {
      itemsToRender = summary.items.filter(i => 
        i.actionChannel === 'IN_HOUSE_FABRICATION' || 
        i.category.toLowerCase().includes('laser') || 
        i.category.toLowerCase().includes('fabricat') ||
        i.name.toLowerCase().includes('laser') ||
        i.name.toLowerCase().includes('cut') ||
        i.technicalSpecification?.toLowerCase().includes('laser')
      );
      reportTitle = titleOverride || 'IN-HOUSE LASER CUTTING & FABRICATION JOB CARD';
      reportSubtitle = 'Workshop Dispatch: Acrylic, MDF & Sheet Metal Parts to Fabricate / Cut';
    } else if (documentType === 'LAB_PREPARATION') {
      itemsToRender = summary.items.filter(i =>
        i.category.toLowerCase().includes('chem') ||
        i.category.toLowerCase().includes('reagent') ||
        i.name.toLowerCase().includes('solution') ||
        i.name.toLowerCase().includes('soln') ||
        i.name.toLowerCase().includes('acid') ||
        i.technicalSpecification?.toLowerCase().includes('soln') ||
        i.technicalSpecification?.toLowerCase().includes('standardized')
      );
      reportTitle = titleOverride || 'CHEMICAL & REAGENT LAB PREPARATION DISPATCH SHEET';
      reportSubtitle = 'Lab Production: Aqueous Solutions, Stains, and Chemical Formulations to Prepare';
    } else if (documentType === 'SELECTED_ITEMS') {
      reportTitle = titleOverride || 'CUSTOM SELECTED ITEMS DISPATCH CHECKLIST';
      reportSubtitle = 'Floor Verification & Dispatch Slip for Selected Materials';
    }

    // Build Deterministic Column Coordinate Grids
    let columns: ColumnLayout[] = [];

    if (isLandscape) {
      // 277mm usable width (Landscape A4)
      if (documentType === 'SHORTAGE_CHECKLIST') {
        const defs = [
          { header: 'SKU / Code', width: 34, align: 'left' as const },
          { header: 'Item Name & Technical Specification', width: 95, align: 'left' as const },
          { header: 'Channel', width: 28, align: 'center' as const },
          { header: 'Deficit Qty', width: 24, align: 'center' as const },
          ...(includePrices ? [
            { header: 'Unit Cost', width: 22, align: 'right' as const },
            { header: 'Ext Total', width: 24, align: 'right' as const },
          ] : []),
          { header: 'Sourcing / Vendor / Market', width: includePrices ? 38 : 74, align: 'left' as const },
          ...(includeCheckboxes ? [{ header: '[ V ]', width: 12, align: 'center' as const }] : []),
        ];
        let currentX = margin;
        columns = defs.map(d => {
          const col = { ...d, x: currentX };
          currentX += d.width;
          return col;
        });
      } else if (documentType === 'WAREHOUSE_PICKLIST') {
        const defs = [
          { header: 'SKU / Code', width: 34, align: 'left' as const },
          { header: 'Component & Model Name', width: 110, align: 'left' as const },
          { header: 'Bin Location', width: 36, align: 'left' as const },
          { header: 'Pick Qty', width: 26, align: 'center' as const },
          { header: 'On Hand', width: 22, align: 'center' as const },
          { header: 'Staging / Class', width: 35, align: 'left' as const },
          ...(includeCheckboxes ? [{ header: 'Picked', width: 14, align: 'center' as const }] : []),
        ];
        let currentX = margin;
        columns = defs.map(d => {
          const col = { ...d, x: currentX };
          currentX += d.width;
          return col;
        });
      } else {
        // Master Full Dispatch (Landscape)
        const defs = [
          { header: 'SKU / Code', width: 30, align: 'left' as const },
          { header: 'Component & Specification', width: 78, align: 'left' as const },
          { header: 'Channel', width: 24, align: 'center' as const },
          { header: 'Req Qty', width: 20, align: 'center' as const },
          { header: 'Stock', width: 16, align: 'center' as const },
          { header: 'Deficit', width: 20, align: 'center' as const },
          ...(includePrices ? [
            { header: 'Unit Cost', width: 18, align: 'right' as const },
            { header: 'Ext Total', width: 22, align: 'right' as const },
          ] : []),
          { header: 'Location / Vendor', width: includePrices ? 36 : 74, align: 'left' as const },
          ...(includeCheckboxes ? [{ header: '[ V ]', width: 13, align: 'center' as const }] : []),
        ];
        let currentX = margin;
        columns = defs.map(d => {
          const col = { ...d, x: currentX };
          currentX += d.width;
          return col;
        });
      }
    } else {
      // 190mm usable width (Portrait A4)
      if (documentType === 'SHORTAGE_CHECKLIST') {
        const defs = [
          { header: 'SKU / Code', width: 28, align: 'left' as const },
          { header: 'Component & Specification', width: 66, align: 'left' as const },
          { header: 'Channel', width: 20, align: 'center' as const },
          { header: 'Deficit', width: 18, align: 'center' as const },
          ...(includePrices ? [
            { header: 'Unit', width: 14, align: 'right' as const },
            { header: 'Total', width: 16, align: 'right' as const },
          ] : []),
          { header: 'Vendor / Market', width: includePrices ? 20 : 44, align: 'left' as const },
          ...(includeCheckboxes ? [{ header: '[ V ]', width: 8, align: 'center' as const }] : []),
        ];
        let currentX = margin;
        columns = defs.map(d => {
          const col = { ...d, x: currentX };
          currentX += d.width;
          return col;
        });
      } else {
        const defs = [
          { header: 'SKU', width: 24, align: 'left' as const },
          { header: 'Component Name & Spec', width: 64, align: 'left' as const },
          { header: 'Channel', width: 20, align: 'center' as const },
          { header: 'Req', width: 14, align: 'center' as const },
          { header: 'Stock', width: 12, align: 'center' as const },
          { header: 'Deficit', width: 16, align: 'center' as const },
          ...(includePrices ? [
            { header: 'Unit', width: 12, align: 'right' as const },
            { header: 'Total', width: 14, align: 'right' as const },
          ] : []),
          { header: 'Location / Vendor', width: includePrices ? 10 : 26, align: 'left' as const },
          ...(includeCheckboxes ? [{ header: '[V]', width: 8, align: 'center' as const }] : []),
        ];
        let currentX = margin;
        columns = defs.map(d => {
          const col = { ...d, x: currentX };
          currentX += d.width;
          return col;
        });
      }
    }

    // Function: Draw Corporate Header Banner
    const drawHeader = (isFirstPage: boolean) => {
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, y, usableWidth, isFirstPage ? (isLandscape ? 20 : 22) : 10, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isFirstPage ? 12 : 8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('EXPERIMIND LABS', margin + 4, y + (isFirstPage ? 6.5 : 6.5));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isFirstPage ? 7 : 6.5);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text('Inventory & Quality Control System - ISO 9001 / 21 CFR Compliant', margin + 4, y + (isFirstPage ? 11.5 : 6.5 + 2.5));

      if (isFirstPage) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(129, 140, 248); // indigo-400
        doc.text(this.sanitizeText(reportTitle), margin + 4, y + 17);

        // Barcode
        const barcodeImg = this.generateBarcode(summary.documentRef);
        if (barcodeImg) {
          doc.addImage(barcodeImg, 'PNG', pageWidth - margin - 36, y + 2, 32, 9);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(summary.documentRef, pageWidth - margin - 36, y + 14.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text(`Date: ${this.sanitizeText(summary.generatedAt)}`, pageWidth - margin - 36, y + 18);

        y += isLandscape ? 23 : 25;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(`${summary.documentRef} - ${this.sanitizeText(summary.projectName)}`, pageWidth - margin - 4, y + 6.5, { align: 'right' });
        y += 12;
      }
    };

    // Draw First Page Header
    drawHeader(true);

    // Project & Metadata Strip (First Page Only)
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(margin, y, usableWidth, 18, 1.5, 1.5, 'FD');

    // Row 1 Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Project:', margin + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${summary.projectCode} - ${this.sanitizeText(summary.projectName)}`, margin + 17, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Client / Scope:', margin + (isLandscape ? 140 : 100), y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(this.sanitizeText(summary.clientName || 'Experimind Labs Internal'), margin + (isLandscape ? 164 : 124), y + 4.5);

    // Row 2 Metadata
    doc.setFont('helvetica', 'bold');
    doc.text('Lead Engineer:', margin + 3, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.text(this.sanitizeText(summary.leadUserName), margin + 24, y + 9);

    doc.setFont('helvetica', 'bold');
    doc.text('Target Delivery:', margin + (isLandscape ? 140 : 100), y + 9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`${summary.targetDeliveryDate} (${summary.batchMultiplier}x Batch)`, margin + (isLandscape ? 164 : 124), y + 9);

    // Row 3: Financial & Readiness KPIs
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Items: ${summary.totalItems}`, margin + 3, y + 14.5);

    doc.setTextColor(22, 101, 52); // emerald-800
    doc.text(`- In-Stock: ${summary.inStockCount} (${summary.stockReadinessPct}%)`, margin + 32, y + 14.5);

    doc.setTextColor(3, 105, 161); // sky-700
    doc.text(`- Local Cash Buy: ${summary.localBuyCount} (~Rs. ${summary.localPurchaseCashINR.toLocaleString('en-IN')})`, margin + (isLandscape ? 75 : 68), y + 14.5);

    doc.setTextColor(126, 34, 206); // purple-700
    doc.text(`- Vendor PO: ${summary.toOrderCount} (~Rs. ${summary.vendorOrdersTotalINR.toLocaleString('en-IN')})`, margin + (isLandscape ? 145 : 128), y + 14.5);

    if (includePrices) {
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`- Budget: Rs. ${summary.totalProcurementValueINR.toLocaleString('en-IN')}`, margin + (isLandscape ? 210 : 3), y + (isLandscape ? 14.5 : 17.5));
    }

    y += 21;

    // Function: Render Table Header
    const drawTableHeader = () => {
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(margin, y, usableWidth, 6.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(255, 255, 255);

      columns.forEach(col => {
        const textX =
          col.align === 'right'
            ? col.x + col.width - 2
            : col.align === 'center'
            ? col.x + col.width / 2
            : col.x + 2;

        doc.text(col.header, textX, y + 4.5, { align: col.align });
      });

      y += 6.5;
    };

    drawTableHeader();

    // Render Data Rows with Guaranteed Coordinates
    let rowIndex = 0;
    itemsToRender.forEach(item => {
      // Word wrap component name & spec
      const nameColWidth = columns[1]?.width || 60;
      const combinedText = `${this.sanitizeText(item.name)}${item.specification ? ' - ' + this.sanitizeText(item.specification) : ''}${
        includeNotes && item.notes ? ' [Note: ' + this.sanitizeText(item.notes) + ']' : ''
      }`;
      const nameLines: string[] = doc.splitTextToSize(combinedText, nameColWidth - 4);
      const rowHeight = Math.max(6.5, nameLines.length * 3.2 + 2.5);

      // Page Overflow Check
      if (y + rowHeight > pageHeight - 20) {
        doc.addPage();
        y = margin;
        drawHeader(false);
        drawTableHeader();
      }

      // Alternating row background
      if (rowIndex % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(margin, y, usableWidth, rowHeight, 'F');
      }

      // Bottom border line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.12);
      doc.line(margin, y + rowHeight, margin + usableWidth, y + rowHeight);

      // Render Individual Columns
      columns.forEach((col, cIdx) => {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);

        const textY = y + 3.8;

        if (cIdx === 0) {
          // SKU Column
          doc.setFont('courier', 'bold');
          doc.setFontSize(6.2);
          doc.setTextColor(79, 70, 229); // indigo-600
          doc.text(this.sanitizeText(item.sku), col.x + 2, textY);
        } else if (cIdx === 1) {
          // Name & Spec
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(15, 23, 42);
          doc.text(nameLines[0] || '', col.x + 2, textY);

          if (nameLines.length > 1) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.8);
            doc.setTextColor(71, 85, 105);
            for (let l = 1; l < nameLines.length; l++) {
              doc.text(nameLines[l], col.x + 2, textY + l * 3.0);
            }
          }
        } else if (col.header === 'Channel') {
          // Channel Vector Badge Pill
          const pillWidth = col.width - 4;
          const pillHeight = 4.2;
          const pillX = col.x + 2;
          const pillY = y + (rowHeight - pillHeight) / 2;

          doc.setFontSize(5.8);
          doc.setFont('helvetica', 'bold');

          if (item.actionChannel === 'IN_STOCK') {
            doc.setFillColor(236, 253, 245); // emerald-50
            doc.setDrawColor(16, 185, 129); // emerald-500
            doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 1, 1, 'FD');
            doc.setTextColor(6, 95, 70);
            doc.text('IN STOCK', col.x + col.width / 2, pillY + 3.0, { align: 'center' });
          } else if (item.actionChannel === 'LOCAL_BUY') {
            doc.setFillColor(240, 249, 255); // sky-50
            doc.setDrawColor(14, 165, 233); // sky-500
            doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 1, 1, 'FD');
            doc.setTextColor(3, 105, 161);
            doc.text('LOCAL BUY', col.x + col.width / 2, pillY + 3.0, { align: 'center' });
          } else if (item.actionChannel === 'TO_ORDER') {
            doc.setFillColor(250, 245, 255); // purple-50
            doc.setDrawColor(168, 85, 247); // purple-500
            doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 1, 1, 'FD');
            doc.setTextColor(107, 33, 168);
            doc.text('VENDOR PO', col.x + col.width / 2, pillY + 3.0, { align: 'center' });
          } else {
            doc.setFillColor(254, 243, 199); // amber-50
            doc.setDrawColor(245, 158, 11); // amber-500
            doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 1, 1, 'FD');
            doc.setTextColor(146, 64, 14);
            doc.text('IN-HOUSE', col.x + col.width / 2, pillY + 3.0, { align: 'center' });
          }
        } else if (col.header === 'Req Qty' || col.header === 'Pick Qty' || col.header === 'Req') {
          doc.setFont('helvetica', 'bold');
          doc.text(`${item.requiredQuantity} ${item.unit}`, col.x + col.width / 2, textY, { align: 'center' });
        } else if (col.header === 'Stock' || col.header === 'On Hand') {
          doc.text(`${item.availableStock}`, col.x + col.width / 2, textY, { align: 'center' });
        } else if (col.header === 'Deficit' || col.header === 'Deficit Qty') {
          if (item.deficitQuantity > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(225, 29, 72); // rose-600
            doc.text(`-${item.deficitQuantity} ${item.unit}`, col.x + col.width / 2, textY, { align: 'center' });
          } else {
            doc.setTextColor(22, 101, 52); // green-700
            doc.text('Covered', col.x + col.width / 2, textY, { align: 'center' });
          }
        } else if (col.header === 'Unit Cost' || col.header === 'Unit') {
          doc.text(`Rs.${item.unitCost}`, col.x + col.width - 2, textY, { align: 'right' });
        } else if (col.header === 'Ext Total' || col.header === 'Total') {
          doc.setFont('helvetica', 'bold');
          doc.text(`Rs.${item.extendedCost.toLocaleString('en-IN')}`, col.x + col.width - 2, textY, { align: 'right' });
        } else if (col.header === 'Bin Location') {
          doc.setFont('courier', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(this.sanitizeText(item.binLocation || 'Rack A-01'), col.x + 2, textY);
        } else if (col.header.includes('Location') || col.header.includes('Vendor') || col.header.includes('Staging')) {
          const locText = item.actionChannel === 'IN_STOCK' ? (item.binLocation || 'Rack A-01') : (item.vendorOrLocation || 'Local Vendor');
          const locLines = doc.splitTextToSize(this.sanitizeText(locText), col.width - 4);
          doc.setFontSize(5.8);
          doc.text(locLines[0] || '', col.x + 2, textY);
        } else if (col.header === '[ V ]' || col.header === 'Picked' || col.header === '[V]') {
          // Crisp vector checkbox
          doc.setDrawColor(71, 85, 105);
          doc.setLineWidth(0.25);
          doc.rect(col.x + col.width / 2 - 2, y + (rowHeight - 4) / 2, 4, 4);
        }
      });

      y += rowHeight;
      rowIndex++;
    });

    // Verification & Sign-Off Authorization Grid (Final Page)
    if (includeSignatures) {
      if (y + 30 > pageHeight - 15) {
        doc.addPage();
        y = margin;
        drawHeader(false);
      }

      y += 4;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.35);
      doc.rect(margin, y, usableWidth, 22);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text('OFFICIAL VERIFICATION & DISPATCH AUTHORIZATION SIGN-OFF', margin + 3, y + 4.2);

      const signColWidth = usableWidth / 4;
      const roles = ['1. Production Planner', '2. Warehouse Dispatch', '3. Quality Assurance', '4. Management Approval'];

      roles.forEach((role, idx) => {
        const signX = margin + idx * signColWidth + 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        doc.text(role, signX, y + 8.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(148, 163, 184);
        doc.text('Signature: ________________', signX, y + 15);
        doc.text('Date: _____/_____/2026', signX, y + 19.5);
      });
    }

    // Page Numbering Footer on All Pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Experimind Labs Inventory System - Document Ref: ${summary.documentRef} - Confidential Internal Document`,
        margin,
        pageHeight - 4.5
      );
      doc.text(
        `Page ${p} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 4.5,
        { align: 'right' }
      );
    }

    return doc;
  }

  /**
   * Browser 1-click download: Shortage Shopping List (Portrait / Landscape)
   */
  public static downloadShortageChecklistPdf(summary: DispatchReportSummary, options: PdfGeneratorOptions = {}): void {
    const doc = this.createDispatchPdf(summary, {
      ...options,
      documentType: 'SHORTAGE_CHECKLIST',
      titleOverride: options.titleOverride || 'PROCUREMENT & SHORTAGE SHOPPING CHECKLIST'
    });
    const rawFilename = options.customFilename || `${summary.documentRef}_Shortage_Shopping_List.pdf`;
    const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '_');
    doc.save(filename);
  }

  /**
   * Browser 1-click download: Warehouse Pick List
   */
  public static downloadWarehousePickListPdf(summary: DispatchReportSummary, options: PdfGeneratorOptions = {}): void {
    const doc = this.createDispatchPdf(summary, {
      ...options,
      documentType: 'WAREHOUSE_PICKLIST',
      titleOverride: options.titleOverride || 'WAREHOUSE STAGING & KITTING PICK LIST'
    });
    const rawFilename = options.customFilename || `${summary.documentRef}_Warehouse_PickList.pdf`;
    const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '_');
    doc.save(filename);
  }

  /**
   * Browser 1-click download: In-House Laser Cutting & Fabrication Job Card
   */
  public static downloadLaserCuttingDispatchPdf(summary: DispatchReportSummary, options: PdfGeneratorOptions = {}): void {
    const doc = this.createDispatchPdf(summary, {
      ...options,
      documentType: 'LASER_CUTTING',
      titleOverride: options.titleOverride || 'IN-HOUSE LASER CUTTING & FABRICATION JOB CARD'
    });
    const rawFilename = options.customFilename || `${summary.documentRef}_Laser_Cutting_JobCard.pdf`;
    const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '_');
    doc.save(filename);
  }

  /**
   * Browser 1-click download: Chemical Formulation & Lab Reagent Preparation Sheet
   */
  public static downloadLabPreparationDispatchPdf(summary: DispatchReportSummary, options: PdfGeneratorOptions = {}): void {
    const doc = this.createDispatchPdf(summary, {
      ...options,
      documentType: 'LAB_PREPARATION',
      titleOverride: options.titleOverride || 'CHEMICAL & REAGENT LAB PREPARATION DISPATCH SHEET'
    });
    const rawFilename = options.customFilename || `${summary.documentRef}_Lab_Preparation_Sheet.pdf`;
    const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '_');
    doc.save(filename);
  }

  /**
   * Browser 1-click download: Full Executive Dispatch Sheet (Landscape by default)
   */
  public static downloadFullDispatchPdf(summary: DispatchReportSummary, options: PdfGeneratorOptions = {}): void {
    const doc = this.createDispatchPdf(summary, {
      ...options,
      documentType: 'FULL_DISPATCH',
      orientation: options.orientation || 'landscape',
      titleOverride: options.titleOverride || 'EXECUTIVE DISPATCH & PRODUCTION READINESS REPORT'
    });
    const rawFilename = options.customFilename || `${summary.documentRef}_Executive_Dispatch_Sheet.pdf`;
    const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '_');
    doc.save(filename);
  }

  /**
   * Browser 1-click download: Custom Selected Items Checklist
   */
  public static downloadSelectedItemsPdf(
    summary: DispatchReportSummary,
    selectedIds: Set<string> | string[],
    options: PdfGeneratorOptions = {}
  ): void {
    const filteredSummary = DispatchPdfService.filterSummaryToSelected(summary, selectedIds);
    const doc = this.createDispatchPdf(filteredSummary, {
      ...options,
      documentType: 'SELECTED_ITEMS',
      titleOverride: options.titleOverride || 'SELECTED ITEMS DISPATCH CHECKLIST'
    });
    const rawFilename = options.customFilename || `${summary.documentRef}_Selected_Checklist.pdf`;
    const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '_');
    doc.save(filename);
  }

  private static filterSummaryToSelected(summary: DispatchReportSummary, selectedIds: Set<string> | string[]): DispatchReportSummary {
    const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
    const selectedItems = summary.items.filter(i => idSet.has(i.id));
    if (selectedItems.length === 0) return summary;

    const totalItems = selectedItems.length;
    const inStockCount = selectedItems.filter(i => i.actionChannel === 'IN_STOCK').length;
    const localBuyCount = selectedItems.filter(i => i.actionChannel === 'LOCAL_BUY').length;
    const toOrderCount = selectedItems.filter(i => i.actionChannel === 'TO_ORDER').length;
    const fabricationCount = selectedItems.filter(i => i.actionChannel === 'IN_HOUSE_FABRICATION').length;
    const stockReadinessPct = totalItems > 0 ? Math.round((inStockCount / totalItems) * 100) : 0;

    const localPurchaseCashINR = selectedItems
      .filter(i => i.actionChannel === 'LOCAL_BUY')
      .reduce((sum, i) => sum + i.extendedCost, 0);

    const vendorOrdersTotalINR = selectedItems
      .filter(i => i.actionChannel === 'TO_ORDER')
      .reduce((sum, i) => sum + i.extendedCost, 0);

    const inStockValueINR = selectedItems
      .filter(i => i.actionChannel === 'IN_STOCK')
      .reduce((sum, i) => sum + i.extendedCost, 0);

    const totalProcurementValueINR = localPurchaseCashINR + vendorOrdersTotalINR;

    return {
      ...summary,
      totalItems,
      inStockCount,
      localBuyCount,
      toOrderCount,
      fabricationCount,
      stockReadinessPct,
      totalProcurementValueINR,
      localPurchaseCashINR,
      vendorOrdersTotalINR,
      inStockValueINR,
      items: selectedItems
    };
  }
}
