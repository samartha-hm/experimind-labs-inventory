import { describe, it, expect } from 'vitest';
import { DispatchReportService } from '../DispatchReportService';
import { ProjectManagementService } from '../ProjectManagementService';

describe('DispatchReportService (Procurement & Production Readiness Dispatch Sheets)', () => {
  it('should classify action channels accurately based on stock and sourcing type', () => {
    // In-Stock when stock >= required
    expect(DispatchReportService.classifyActionChannel('VENDOR_OFF_THE_SHELF', 10, 15)).toBe('IN_STOCK');
    expect(DispatchReportService.classifyActionChannel('LOCAL_PURCHASE', 5, 5)).toBe('IN_STOCK');

    // In-House Fabrication
    expect(DispatchReportService.classifyActionChannel('LASER_CUTTING', 10, 0)).toBe('IN_HOUSE_FABRICATION');
    expect(DispatchReportService.classifyActionChannel('MODEL_ASSEMBLY', 10, 2)).toBe('IN_HOUSE_FABRICATION');
    expect(DispatchReportService.classifyActionChannel('IN_HOUSE_PREP', 10, 0)).toBe('IN_HOUSE_FABRICATION');

    // Local Market Buy
    expect(DispatchReportService.classifyActionChannel('LOCAL_PURCHASE', 20, 3)).toBe('LOCAL_BUY');
    expect(DispatchReportService.classifyActionChannel('HARDWARE_SUPPLIES', 15, 0)).toBe('LOCAL_BUY');

    // Vendor PO
    expect(DispatchReportService.classifyActionChannel('VENDOR_OFF_THE_SHELF', 50, 5)).toBe('TO_ORDER');
  });

  it('should build a project dispatch report with financial rollups and 4-channel categorization', () => {
    const report = DispatchReportService.buildProjectDispatchReport('PRJ-001', { overrideBatchMultiplier: 10 });
    expect(report).not.toBeNull();
    expect(report?.projectName).toBeDefined();
    expect(report?.batchMultiplier).toBe(10);
    expect(report?.items.length).toBeGreaterThan(0);
    expect(report?.documentRef).toContain('EXP-PROJ-');

    // Metrics
    expect(report?.totalItems).toBe(report?.items.length);
    expect(report?.stockReadinessPct).toBeGreaterThanOrEqual(0);
    expect(report?.totalProcurementValueINR).toBeGreaterThan(0);

    // Verify item scaling
    const firstItem = report?.items[0];
    expect(firstItem?.requiredQuantity).toBeGreaterThan(0);
  });

  it('should build a master production matrix dispatch report scaled by multiplier', () => {
    const report = DispatchReportService.buildProductionMatrixDispatchReport(5, 'ALL');
    expect(report).not.toBeNull();
    expect(report.projectName).toContain('Master Production & Sourcing Matrix');
    expect(report.batchMultiplier).toBe(5);
    expect(report.items.length).toBeGreaterThan(50);
    expect(report.documentRef).toContain('EXP-MAT-');
  });

  it('should generate a multi-worksheet Excel (.xlsx) workbook buffer', () => {
    const report = DispatchReportService.buildProductionMatrixDispatchReport(10, 'ALL');
    const excelBuffer = DispatchReportService.generateExcelWorkbook(report);
    expect(excelBuffer).toBeDefined();
    expect(excelBuffer.byteLength || (excelBuffer as any).length).toBeGreaterThan(1000); // Valid xlsx binary
  });

  it('should generate RFC compliant CSV data output', () => {
    const report = DispatchReportService.buildProductionMatrixDispatchReport(5, 'ALL');
    const csv = DispatchReportService.generateCsv(report);
    expect(csv).toBeDefined();
    expect(csv).toContain('SKU,Name,Category,Specification,Action Channel');
    expect(csv.split('\n').length).toBeGreaterThan(10);
  });

  it('should generate formatted WhatsApp / Slack standup summary text', () => {
    const report = DispatchReportService.buildProductionMatrixDispatchReport(5, 'ALL');
    const text = DispatchReportService.generateWhatsAppSummaryText(report);
    expect(text).toContain('EXPERIMIND LABS — PROCUREMENT & PRODUCTION DISPATCH');
    expect(text).toContain('READINESS & FINANCIAL SUMMARY');
    expect(text).toContain('Ref:');
  });

  it('should generate professional multi-page vector PDFs using DispatchPdfService', async () => {
    const { DispatchPdfService } = await import('../DispatchPdfService');
    const report = DispatchReportService.buildProductionMatrixDispatchReport(5, 'ALL');

    // 1. Full Dispatch PDF
    const fullPdf = DispatchPdfService.createDispatchPdf(report, { documentType: 'FULL_DISPATCH' });
    expect(fullPdf).toBeDefined();
    expect(fullPdf.getNumberOfPages()).toBeGreaterThan(0);
    const fullBlob = fullPdf.output('arraybuffer');
    expect(fullBlob.byteLength).toBeGreaterThan(5000);

    // 2. Shortage Shopping Checklist PDF
    const shortagePdf = DispatchPdfService.createDispatchPdf(report, { documentType: 'SHORTAGE_CHECKLIST' });
    expect(shortagePdf).toBeDefined();
    expect(shortagePdf.getNumberOfPages()).toBeGreaterThan(0);

    // 3. Warehouse Pick List PDF
    const pickPdf = DispatchPdfService.createDispatchPdf(report, { documentType: 'WAREHOUSE_PICKLIST' });
    expect(pickPdf).toBeDefined();
    expect(pickPdf.getNumberOfPages()).toBeGreaterThan(0);

    // 4. Custom Selected Items PDF
    const selectedIds = new Set(report.items.slice(0, 3).map(i => i.id));
    const selectedPdf = DispatchPdfService.createDispatchPdf(
      DispatchReportService.filterSummaryToItems(report, selectedIds),
      { documentType: 'SELECTED_ITEMS' }
    );
    expect(selectedPdf).toBeDefined();
    expect(selectedPdf.getNumberOfPages()).toBeGreaterThan(0);
  });
});
