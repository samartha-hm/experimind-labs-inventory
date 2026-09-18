import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { DispatchReportSummary, DispatchItem } from './DispatchReportService';

export type PdfDocumentType = 'FULL_DISPATCH' | 'SHORTAGE_CHECKLIST' | 'WAREHOUSE_PICKLIST' | 'SELECTED_ITEMS';

export interface PdfGeneratorOptions {
  documentType?: PdfDocumentType;
  includePrices?: boolean;
  includeNotes?: boolean;
  includeCheckboxes?: boolean;
  includeSignatures?: boolean;
  titleOverride?: string;
  customFilename?: string;
}

export class DispatchPdfService {
  /**
   * Generates a Base64 data URL barcode for the document header
   */
  private static generateBarcode(text: string): string {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, text || 'DISP-001', {
        format: 'CODE128',
        width: 2,
        height: 40,
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
   * Core multi-page PDF generation engine
   */
  public static createDispatchPdf(
    summary: DispatchReportSummary,
    options: PdfGeneratorOptions = {}
  ): jsPDF {
    const {
      documentType = 'FULL_DISPATCH',
      includePrices = true,
      includeNotes = true,
      includeCheckboxes = true,
      includeSignatures = true,
      titleOverride
    } = options;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12;
    const usableWidth = pageWidth - margin * 2;
    let y = margin;

    // Filter items based on document type
    let itemsToRender: DispatchItem[] = summary.items;
    let reportTitle = titleOverride || 'EXECUTIVE DISPATCH & PRODUCTION READINESS REPORT';
    let reportSubtitle = 'Complete Bill of Materials • Readiness Breakdown • Sourcing Matrix';

    if (documentType === 'SHORTAGE_CHECKLIST') {
      itemsToRender = summary.items.filter(i => i.deficitQuantity > 0);
      reportTitle = titleOverride || 'PROCUREMENT & SHORTAGE SHOPPING CHECKLIST';
      reportSubtitle = 'Action Required: Items Needing Local Market Purchase & Vendor Purchase Orders';
    } else if (documentType === 'WAREHOUSE_PICKLIST') {
      itemsToRender = summary.items.filter(i => i.actionChannel === 'IN_STOCK' || i.actionChannel === 'IN_HOUSE_FABRICATION');
      reportTitle = titleOverride || 'WAREHOUSE STAGING & KITTING PICK LIST';
      reportSubtitle = 'Floor Order: Components to Pick from Storage Bins & Internal Fabrication Workshop';
    } else if (documentType === 'SELECTED_ITEMS') {
      reportTitle = titleOverride || 'CUSTOM SELECTED ITEMS DISPATCH CHECKLIST';
      reportSubtitle = 'Floor Verification & Dispatch Slip for Selected Materials';
    }

    // Helper: Draw Header & Brand
    const drawHeader = (isFirstPage: boolean) => {
      // Top Bar Background
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, y, usableWidth, isFirstPage ? 22 : 12, 'F');

      // Company Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isFirstPage ? 13 : 9);
      doc.setTextColor(255, 255, 255);
      doc.text('EXPERIMIND LABS', margin + 4, y + (isFirstPage ? 7 : 7));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isFirstPage ? 7.5 : 7);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text('Inventory & Quality Control System • ISO 9001 / 21 CFR Compliant', margin + 4, y + (isFirstPage ? 13 : 7 + 3.5));

      if (isFirstPage) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(129, 140, 248); // indigo-400
        doc.text(reportTitle, margin + 4, y + 19);

        // Barcode on First Page
        const barcodeData = this.generateBarcode(summary.documentRef);
        if (barcodeData) {
          doc.addImage(barcodeData, 'PNG', pageWidth - margin - 38, y + 2, 35, 11);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(summary.documentRef, pageWidth - margin - 38, y + 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Date: ${summary.generatedAt}`, pageWidth - margin - 38, y + 19.5);

        y += 24;
      } else {
        // Subsequent pages header
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(`${summary.documentRef} — ${summary.projectName}`, pageWidth - margin - 4, y + 7, { align: 'right' });
        y += 14;
      }
    };

    // Draw initial header
    drawHeader(true);

    // Metadata & Summary Card (First page only)
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(margin, y, usableWidth, 22, 1.5, 1.5, 'FD');

    // Row 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Project:', margin + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${summary.projectCode} — ${summary.projectName}`, margin + 18, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('Client / Scope:', margin + 110, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(summary.clientName || 'Experimind Labs Internal', margin + 133, y + 5);

    // Row 2
    doc.setFont('helvetica', 'bold');
    doc.text('Lead Engineer:', margin + 3, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(summary.leadUserName, margin + 25, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.text('Target Delivery:', margin + 110, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`${summary.targetDeliveryDate} (${summary.batchMultiplier}x Batch)`, margin + 133, y + 10);

    // Row 3: Metrics Strip
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Items: ${summary.totalItems}`, margin + 3, y + 16);
    doc.setTextColor(22, 101, 52); // green-800
    doc.text(`• In-Stock: ${summary.inStockCount} (${summary.stockReadinessPct}%)`, margin + 35, y + 16);
    doc.setTextColor(3, 105, 161); // sky-700
    doc.text(`• Local Buy: ${summary.localBuyCount} (~₹${summary.localPurchaseCashINR.toLocaleString('en-IN')})`, margin + 78, y + 16);
    doc.setTextColor(126, 34, 206); // purple-700
    doc.text(`• Vendor PO: ${summary.toOrderCount} (~₹${summary.vendorOrdersTotalINR.toLocaleString('en-IN')})`, margin + 128, y + 16);

    if (includePrices) {
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`• Budget: ₹${summary.totalProcurementValueINR.toLocaleString('en-IN')}`, margin + 3, y + 20);
    }
    doc.setTextColor(180, 83, 9);
    doc.text(`• In-House Fab: ${summary.fabricationCount} jobs`, margin + (includePrices ? 55 : 3), y + 20);

    y += 26;

    // Define Column Layouts
    interface ColumnDef {
      header: string;
      width: number;
      align?: 'left' | 'center' | 'right';
    }

    let columns: ColumnDef[] = [];

    if (documentType === 'SHORTAGE_CHECKLIST') {
      columns = [
        { header: 'SKU / Code', width: 24, align: 'left' },
        { header: 'Item Name & Technical Spec', width: 62, align: 'left' },
        { header: 'Channel', width: 22, align: 'center' },
        { header: 'Deficit Qty', width: 22, align: 'center' },
        ...(includePrices
          ? [
              { header: 'Unit (₹)', width: 16, align: 'right' as const },
              { header: 'Total (₹)', width: 18, align: 'right' as const },
            ]
          : []),
        { header: 'Vendor / Market Location', width: includePrices ? 32 : 46, align: 'left' },
        ...(includeCheckboxes ? [{ header: '[✓]', width: 10, align: 'center' as const }] : []),
      ];
    } else if (documentType === 'WAREHOUSE_PICKLIST') {
      columns = [
        { header: 'SKU / Code', width: 26, align: 'left' },
        { header: 'Component & Model Name', width: 72, align: 'left' },
        { header: 'Bin Location', width: 28, align: 'left' },
        { header: 'Pick Qty', width: 22, align: 'center' },
        { header: 'On Hand', width: 18, align: 'center' },
        ...(includeCheckboxes ? [{ header: 'Picked', width: 20, align: 'center' as const }] : []),
      ];
    } else {
      // Full Dispatch Sheet
      columns = [
        { header: 'SKU', width: 22, align: 'left' },
        { header: 'Component & Specification', width: 56, align: 'left' },
        { header: 'Channel', width: 20, align: 'center' },
        { header: 'Req Qty', width: 18, align: 'center' },
        { header: 'Stock', width: 14, align: 'center' },
        { header: 'Deficit', width: 16, align: 'center' },
        ...(includePrices
          ? [
              { header: 'Cost (₹)', width: 14, align: 'right' as const },
              { header: 'Ext (₹)', width: 16, align: 'right' as const },
            ]
          : []),
        { header: 'Location / Vendor', width: includePrices ? 20 : 30, align: 'left' },
        ...(includeCheckboxes ? [{ header: '[✓]', width: 10, align: 'center' as const }] : []),
      ];
    }

    // Adjust total width to fill exactly usableWidth
    const currentTotalWidth = columns.reduce((acc, c) => acc + c.width, 0);
    const scale = usableWidth / currentTotalWidth;
    columns = columns.map(c => ({ ...c, width: c.width * scale }));

    // Function: Render Table Header
    const drawTableHeader = () => {
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(margin, y, usableWidth, 7, 'F');

      let currentX = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);

      columns.forEach(col => {
        const textX =
          col.align === 'right'
            ? currentX + col.width - 2
            : col.align === 'center'
            ? currentX + col.width / 2
            : currentX + 2;

        doc.text(col.header, textX, y + 4.8, { align: col.align || 'left' });
        currentX += col.width;
      });

      y += 7;
    };

    drawTableHeader();

    // Render Table Rows
    let rowIndex = 0;
    itemsToRender.forEach(item => {
      // Estimate row height based on name & spec text length
      const nameLines = doc.splitTextToSize(
        `${item.name}${item.specification ? ' • ' + item.specification : ''}${includeNotes && item.notes ? ' [Note: ' + item.notes + ']' : ''}`,
        columns[1].width - 4
      );
      const rowHeight = Math.max(7, nameLines.length * 3.4 + 3);

      // Check for Page Overflow
      if (y + rowHeight > pageHeight - 25) {
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

      // Border line bottom
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.15);
      doc.line(margin, y + rowHeight, margin + usableWidth, y + rowHeight);

      // Cell Data Printing
      let currentX = margin;

      columns.forEach((col, cIdx) => {
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);

        const textY = y + 4;

        if (cIdx === 0) {
          // SKU
          doc.setFont('courier', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(79, 70, 229); // indigo-600
          doc.text(item.sku, currentX + 2, textY);
        } else if (cIdx === 1) {
          // Component Name & Specification
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(15, 23, 42);
          doc.text(nameLines[0] || '', currentX + 2, textY);

          if (nameLines.length > 1) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.2);
            doc.setTextColor(71, 85, 105); // slate-600
            for (let l = 1; l < nameLines.length; l++) {
              doc.text(nameLines[l], currentX + 2, textY + l * 3.2);
            }
          }
        } else if (col.header === 'Channel') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.2);
          if (item.actionChannel === 'IN_STOCK') {
            doc.setTextColor(22, 101, 52);
            doc.text('IN STOCK', currentX + col.width / 2, textY, { align: 'center' });
          } else if (item.actionChannel === 'LOCAL_BUY') {
            doc.setTextColor(3, 105, 161);
            doc.text('LOCAL BUY', currentX + col.width / 2, textY, { align: 'center' });
          } else if (item.actionChannel === 'TO_ORDER') {
            doc.setTextColor(126, 34, 206);
            doc.text('VENDOR PO', currentX + col.width / 2, textY, { align: 'center' });
          } else {
            doc.setTextColor(180, 83, 9);
            doc.text('IN-HOUSE', currentX + col.width / 2, textY, { align: 'center' });
          }
        } else if (col.header === 'Req Qty' || col.header === 'Pick Qty') {
          doc.setFont('helvetica', 'bold');
          doc.text(`${item.requiredQuantity} ${item.unit}`, currentX + col.width / 2, textY, { align: 'center' });
        } else if (col.header === 'Stock' || col.header === 'On Hand') {
          doc.text(`${item.availableStock}`, currentX + col.width / 2, textY, { align: 'center' });
        } else if (col.header === 'Deficit' || col.header === 'Deficit Qty') {
          if (item.deficitQuantity > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(225, 29, 72); // rose-600
            doc.text(`-${item.deficitQuantity} ${item.unit}`, currentX + col.width / 2, textY, { align: 'center' });
          } else {
            doc.setTextColor(22, 101, 52);
            doc.text('✓ Covered', currentX + col.width / 2, textY, { align: 'center' });
          }
        } else if (col.header === 'Cost (₹)' || col.header === 'Unit (₹)') {
          doc.text(`₹${item.unitCost}`, currentX + col.width - 2, textY, { align: 'right' });
        } else if (col.header === 'Ext (₹)' || col.header === 'Total (₹)') {
          doc.setFont('helvetica', 'bold');
          doc.text(`₹${item.extendedCost.toLocaleString('en-IN')}`, currentX + col.width - 2, textY, { align: 'right' });
        } else if (col.header === 'Bin Location') {
          doc.setFont('courier', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(item.binLocation || 'Rack Shelf', currentX + 2, textY);
        } else if (col.header === 'Vendor / Market Location' || col.header === 'Location / Vendor') {
          doc.setFontSize(6.2);
          doc.text(doc.splitTextToSize(item.vendorOrLocation || '', col.width - 4)[0] || '', currentX + 2, textY);
        } else if (col.header === '[✓]' || col.header === 'Picked') {
          // Draw Physical Checklist Square Box
          doc.setDrawColor(71, 85, 105);
          doc.setLineWidth(0.3);
          doc.rect(currentX + col.width / 2 - 2, y + rowHeight / 2 - 2, 4, 4);
        }

        currentX += col.width;
      });

      y += rowHeight;
      rowIndex++;
    });

    // Check if Signatures Block fits on current page
    if (includeSignatures) {
      if (y + 35 > pageHeight - 15) {
        doc.addPage();
        y = margin;
        drawHeader(false);
      }

      y += 4;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.rect(margin, y, usableWidth, 26);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text('OFFICIAL VERIFICATION & DISPATCH AUTHORIZATION SIGN-OFF', margin + 3, y + 4.5);

      const signColWidth = usableWidth / 4;
      const roles = ['1. Production Planner', '2. Warehouse Dispatch', '3. Quality Assurance', '4. Management Approval'];

      roles.forEach((role, idx) => {
        const signX = margin + idx * signColWidth + 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(role, signX, y + 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text('Signature: ________________', signX, y + 18);
        doc.text('Date: _____/_____/2026', signX, y + 23);
      });
    }

    // Add Page Numbering on all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(
        `Experimind Labs Inventory & Production Dispatch • Document Ref: ${summary.documentRef}`,
        margin,
        pageHeight - 6
      );
      doc.text(
        `Page ${p} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: 'right' }
      );
    }

    return doc;
  }

  /**
   * Browser 1-click download helper for Shortage / To Buy checklist
   */
  public static downloadShortageChecklistPdf(summary: DispatchReportSummary, options: PdfGeneratorOptions = {}): void {
    const doc = this.createDispatchPdf(summary, {
      ...options,
      documentType: 'SHORTAGE_CHECKLIST',
      titleOverride: options.titleOverride || 'PROCUREMENT & SHORTAGE SHOPPING CHECKLIST'
    });
    const filename = options.customFilename || `${summary.documentRef}_Shortage_Shopping_List.pdf`;
    doc.save(filename);
  }

  /**
   * Browser 1-click download helper for Warehouse Pick List
   */
  public static downloadWarehousePickListPdf(summary: DispatchReportSummary, options: PdfGeneratorOptions = {}): void {
    const doc = this.createDispatchPdf(summary, {
      ...options,
      documentType: 'WAREHOUSE_PICKLIST',
      titleOverride: options.titleOverride || 'WAREHOUSE STAGING & KITTING PICK LIST'
    });
    const filename = options.customFilename || `${summary.documentRef}_Warehouse_PickList.pdf`;
    doc.save(filename);
  }

  /**
   * Browser 1-click download helper for Full Executive Dispatch Report
   */
  public static downloadFullDispatchPdf(summary: DispatchReportSummary, options: PdfGeneratorOptions = {}): void {
    const doc = this.createDispatchPdf(summary, {
      ...options,
      documentType: 'FULL_DISPATCH',
      titleOverride: options.titleOverride || 'EXECUTIVE DISPATCH & PRODUCTION READINESS REPORT'
    });
    const filename = options.customFilename || `${summary.documentRef}_Executive_Dispatch_Sheet.pdf`;
    doc.save(filename);
  }

  /**
   * Browser 1-click download helper for Custom Selected Items
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
    const filename = options.customFilename || `${summary.documentRef}_Selected_Checklist.pdf`;
    doc.save(filename);
  }

  /**
   * Helper to slice summary to selected items
   */
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
