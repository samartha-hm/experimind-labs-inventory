import * as XLSX from 'xlsx';
import { Project, ProjectClassWork, ProjectWorkItem } from '../data/projectsDataset';
import { ProductionItem, SourcingType } from '../data/productionDataset';
import { ProductionWorkflowService } from './ProductionWorkflowService';
import { ProjectManagementService } from './ProjectManagementService';

export type ActionChannel = 'IN_STOCK' | 'LOCAL_BUY' | 'TO_ORDER' | 'IN_HOUSE_FABRICATION';

export interface DispatchItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  specification: string;
  sourcingChannel: string;
  actionChannel: ActionChannel;
  requiredQuantity: number;
  availableStock: number;
  deficitQuantity: number;
  unit: string;
  unitCost: number;
  extendedCost: number;
  vendorOrLocation: string;
  leadTimeDays: number;
  binLocation: string;
  targetClassOrProject: string;
  imageUrl?: string;
  status: string;
  notes?: string;
}

export interface DispatchReportSummary {
  projectId?: string;
  projectCode?: string;
  projectName: string;
  clientName?: string;
  leadUserName: string;
  targetDeliveryDate: string;
  batchMultiplier: number;
  generatedAt: string;
  documentRef: string;
  totalItems: number;
  inStockCount: number;
  localBuyCount: number;
  toOrderCount: number;
  fabricationCount: number;
  stockReadinessPct: number;
  totalProcurementValueINR: number;
  localPurchaseCashINR: number;
  vendorOrdersTotalINR: number;
  inStockValueINR: number;
  items: DispatchItem[];
}

export class DispatchReportService {
  /**
   * Generates a unique document tracking reference ID
   */
  public static generateDocumentRef(prefix = 'EXP-DISP'): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${y}${m}-${rand}`;
  }

  /**
   * Classify work item or production item into one of the 4 operational action channels
   */
  public static classifyActionChannel(
    sourcingChannel: string,
    requiredQty: number,
    availableStock: number
  ): ActionChannel {
    const ch = (sourcingChannel || '').toUpperCase();

    // 1. If stock is fully available, prioritize warehouse picking
    if (availableStock >= requiredQty && requiredQty > 0) {
      return 'IN_STOCK';
    }

    // 2. In-House fabrication channels
    if (
      ch.includes('LASER') ||
      ch.includes('3D') ||
      ch.includes('PREP') ||
      ch.includes('ASSEMBLY') ||
      ch.includes('CHEMICAL_PREP') ||
      ch.includes('MODEL')
    ) {
      return 'IN_HOUSE_FABRICATION';
    }

    // 3. Local market purchase channels (fasteners, local hardware, cash pickups)
    if (
      ch.includes('LOCAL') ||
      ch.includes('MARKET') ||
      ch.includes('HARDWARE') ||
      ch.includes('CASH') ||
      ch.includes('ADHESIVE') ||
      ch.includes('RAW_MATERIAL')
    ) {
      return 'LOCAL_BUY';
    }

    // 4. Default to vendor purchase order
    return 'TO_ORDER';
  }

  /**
   * Builds a consolidated dispatch summary from an active project
   */
  public static buildProjectDispatchReport(
    projectId: string,
    options?: { overrideBatchMultiplier?: number; classFilterId?: string }
  ): DispatchReportSummary | null {
    const project = ProjectManagementService.getProjectById(projectId);
    if (!project) return null;

    const multiplier = options?.overrideBatchMultiplier || project.defaultBatchMultiplier || 1;
    const documentRef = this.generateDocumentRef('EXP-PROJ');
    const items: DispatchItem[] = [];

    const targetClasses = options?.classFilterId && options.classFilterId !== 'ALL'
      ? project.classes.filter(c => c.id === options.classFilterId)
      : project.classes;

    for (const cls of targetClasses) {
      const clsMultiplier = options?.overrideBatchMultiplier || cls.batchMultiplier || multiplier;

      for (const item of cls.items) {
        const requiredQty = item.quantityPerBatchUnit * clsMultiplier;
        // Mock / Mapped stock baseline (in production, connected to InventoryService)
        const availableStock = (item.name.length * 7) % 35; // deterministic realistic stock
        const deficitQty = Math.max(0, requiredQty - availableStock);
        const actionChannel = this.classifyActionChannel(item.sourcingChannel, requiredQty, availableStock);
        const unitCost = item.unitCost || 25;
        const extendedCost = deficitQty * unitCost;

        let vendorOrLocation = 'Vendor PO (Robu / Sunrom)';
        let leadTimeDays = 3;

        if (actionChannel === 'LOCAL_BUY') {
          vendorOrLocation = 'Local Hardware / SP Road Electronics Market';
          leadTimeDays = 1;
        } else if (actionChannel === 'IN_HOUSE_FABRICATION') {
          vendorOrLocation = 'Experimind Labs Internal Workshop';
          leadTimeDays = 2;
        } else if (actionChannel === 'IN_STOCK') {
          vendorOrLocation = 'Warehouse Rack A-02 / Bin 14';
          leadTimeDays = 0;
        }

        items.push({
          id: item.id,
          sku: `SKU-${item.id.replace('item-', 'EXP-')}`,
          name: item.name,
          category: item.category,
          specification: item.specification || 'Standard Educational Specification',
          sourcingChannel: item.sourcingChannel,
          actionChannel,
          requiredQuantity: requiredQty,
          availableStock,
          deficitQuantity: deficitQty,
          unit: item.unit || 'pcs',
          unitCost,
          extendedCost,
          vendorOrLocation,
          leadTimeDays,
          binLocation: actionChannel === 'IN_STOCK' ? 'Rack A-02, Bin 14' : 'N/A (To Procure)',
          targetClassOrProject: `${cls.name} (${project.code})`,
          imageUrl: item.imageUrl,
          status: item.status,
          notes: item.notes || item.sourceChapter || undefined
        });
      }
    }

    return this.calculateSummaryMetrics(
      items,
      project.name,
      project.id,
      project.code,
      project.clientName,
      project.leadUserName,
      project.targetDeliveryDate,
      multiplier,
      documentRef
    );
  }

  /**
   * Builds a consolidated dispatch summary from the master production matrix
   */
  public static buildProductionMatrixDispatchReport(
    multiplier = 5,
    gradeFilter = 'ALL'
  ): DispatchReportSummary {
    const rawItems = ProductionWorkflowService.getItems(
      gradeFilter !== 'ALL' ? { grade: gradeFilter } : undefined
    );
    const documentRef = this.generateDocumentRef('EXP-MAT');
    const items: DispatchItem[] = [];

    for (const item of rawItems) {
      const requiredQty = item.quantityPerKit * multiplier;
      const availableStock = item.currentStock || 0;
      const deficitQty = Math.max(0, requiredQty - availableStock);
      const actionChannel = this.classifyActionChannel(item.sourcingType, requiredQty, availableStock);
      const unitCost = item.unitCost || 30;
      const extendedCost = deficitQty * unitCost;

      let vendorOrLocation = 'Robu.in / Mouser Electronics';
      let leadTimeDays = 4;

      if (actionChannel === 'LOCAL_BUY') {
        vendorOrLocation = 'SP Road Hardware & Electrical Hub';
        leadTimeDays = 1;
      } else if (actionChannel === 'IN_HOUSE_FABRICATION') {
        vendorOrLocation = 'In-House Laser / Chemical Lab';
        leadTimeDays = 2;
      } else if (actionChannel === 'IN_STOCK') {
        vendorOrLocation = item.warehouseBin || 'Main Warehouse Shelf B-1';
        leadTimeDays = 0;
      }

      items.push({
        id: item.id,
        sku: item.activityCode || `SKU-MAT-${item.id}`,
        name: item.materialName,
        category: item.pouchCategory,
        specification: `${item.activityName} (${item.prepSpecification})`,
        sourcingChannel: item.sourcingType,
        actionChannel,
        requiredQuantity: requiredQty,
        availableStock,
        deficitQuantity: deficitQty,
        unit: 'units',
        unitCost,
        extendedCost,
        vendorOrLocation,
        leadTimeDays,
        binLocation: item.warehouseBin || 'Main Warehouse Shelf B-1',
        targetClassOrProject: item.grade || 'Consolidated Matrix',
        imageUrl: item.imageUrl,
        status: item.status,
        notes: item.activityName
      });
    }

    return this.calculateSummaryMetrics(
      items,
      `Master Production & Sourcing Matrix (${gradeFilter})`,
      'PROD-MATRIX-ALL',
      'PRJ-PROD-ALL',
      'Experimind Labs Internal Operations',
      'Dr. Samartha HM',
      new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      multiplier,
      documentRef
    );
  }

  /**
   * Helper to compute consolidated financial & quantity metrics
   */
  private static calculateSummaryMetrics(
    items: DispatchItem[],
    projectName: string,
    projectId: string,
    projectCode: string,
    clientName: string | undefined,
    leadUserName: string,
    targetDeliveryDate: string,
    batchMultiplier: number,
    documentRef: string
  ): DispatchReportSummary {
    let inStockCount = 0;
    let localBuyCount = 0;
    let toOrderCount = 0;
    let fabricationCount = 0;

    let totalProcurementValueINR = 0;
    let localPurchaseCashINR = 0;
    let vendorOrdersTotalINR = 0;
    let inStockValueINR = 0;

    for (const item of items) {
      if (item.actionChannel === 'IN_STOCK') {
        inStockCount++;
        inStockValueINR += item.requiredQuantity * item.unitCost;
      } else if (item.actionChannel === 'LOCAL_BUY') {
        localBuyCount++;
        localPurchaseCashINR += item.extendedCost;
        totalProcurementValueINR += item.extendedCost;
      } else if (item.actionChannel === 'TO_ORDER') {
        toOrderCount++;
        vendorOrdersTotalINR += item.extendedCost;
        totalProcurementValueINR += item.extendedCost;
      } else if (item.actionChannel === 'IN_HOUSE_FABRICATION') {
        fabricationCount++;
        totalProcurementValueINR += item.extendedCost;
      }
    }

    const totalItems = items.length;
    const stockReadinessPct = totalItems > 0 ? Math.round((inStockCount / totalItems) * 100) : 0;

    return {
      projectId,
      projectCode,
      projectName,
      clientName,
      leadUserName,
      targetDeliveryDate,
      batchMultiplier,
      generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      documentRef,
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
      items
    };
  }

  /**
   * Clones and recalculates a summary for a specific subset of items (e.g. user selected items)
   */
  public static filterSummaryToItems(summary: DispatchReportSummary, itemIds: Set<string> | string[]): DispatchReportSummary {
    const idSet = itemIds instanceof Set ? itemIds : new Set(itemIds);
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

  /**
   * Exports an Excel (.xlsx) file with multiple categorized worksheets
   */
  public static generateExcelWorkbook(summary: DispatchReportSummary): any {
    const wb = XLSX.utils.book_new();

    // 1. Sheet: Master Summary
    const masterData = summary.items.map(item => ({
      'SKU / Code': item.sku,
      'Component / Material Name': item.name,
      'Category': item.category,
      'Specification': item.specification,
      'Action Channel': item.actionChannel,
      'Stock Status': item.actionChannel === 'IN_STOCK' ? 'IN STOCK' : `DEFICIT (-${item.deficitQuantity})`,
      'Required Qty': item.requiredQuantity,
      'Available Stock': item.availableStock,
      'To Procure / Fabricate': item.deficitQuantity,
      'Unit': item.unit,
      'Unit Cost (₹)': item.unitCost,
      'Total Cost (₹)': item.extendedCost,
      'Vendor / Sourcing Location': item.vendorOrLocation,
      'Lead Time (Days)': item.leadTimeDays,
      'Bin Location': item.binLocation,
      'Target Class / Batch': item.targetClassOrProject,
      'Notes': item.notes || ''
    }));
    const wsMaster = XLSX.utils.json_to_sheet(masterData);
    XLSX.utils.book_append_sheet(wb, wsMaster, 'Master_Dispatch');

    // 2. Sheet: Local Market Shopping List
    const localItems = summary.items
      .filter(i => i.actionChannel === 'LOCAL_BUY')
      .map(item => ({
        'Item Name': item.name,
        'Quantity to Buy': item.deficitQuantity,
        'Unit': item.unit,
        'Est. Unit Price (₹)': item.unitCost,
        'Est. Total Cash (₹)': item.extendedCost,
        'Market Location': item.vendorOrLocation,
        'Specification': item.specification,
        'Target Class / Kit': item.targetClassOrProject,
        'Purchased [ ]': 'No'
      }));
    const wsLocal = XLSX.utils.json_to_sheet(localItems.length > 0 ? localItems : [{ 'Notice': 'No local items required' }]);
    XLSX.utils.book_append_sheet(wb, wsLocal, 'Local_Market_Shopping');

    // 3. Sheet: Vendor Purchase Orders
    const vendorItems = summary.items
      .filter(i => i.actionChannel === 'TO_ORDER')
      .map(item => ({
        'SKU': item.sku,
        'Component Name': item.name,
        'Order Quantity': item.deficitQuantity,
        'Unit': item.unit,
        'Unit Cost (₹)': item.unitCost,
        'Total Order (₹)': item.extendedCost,
        'Preferred Vendor': item.vendorOrLocation,
        'Lead Time': `${item.leadTimeDays} days`,
        'Specification': item.specification,
        'Target Class': item.targetClassOrProject,
        'PO Issued [ ]': 'Pending'
      }));
    const wsVendor = XLSX.utils.json_to_sheet(vendorItems.length > 0 ? vendorItems : [{ 'Notice': 'No vendor orders required' }]);
    XLSX.utils.book_append_sheet(wb, wsVendor, 'Vendor_Purchase_Orders');

    // 4. Sheet: Warehouse Pick List (In-Stock)
    const pickItems = summary.items
      .filter(i => i.actionChannel === 'IN_STOCK')
      .map(item => ({
        'Bin / Rack Location': item.binLocation,
        'Component Name': item.name,
        'Pick Qty': item.requiredQuantity,
        'Available On-Hand': item.availableStock,
        'Unit': item.unit,
        'Staging Dest': item.targetClassOrProject,
        'Picked [ ]': 'Pending',
        'Verified By': ''
      }));
    const wsPick = XLSX.utils.json_to_sheet(pickItems.length > 0 ? pickItems : [{ 'Notice': 'No in-stock items' }]);
    XLSX.utils.book_append_sheet(wb, wsPick, 'Warehouse_Pick_List');

    // 5. Sheet: In-House Fabrication
    const fabItems = summary.items
      .filter(i => i.actionChannel === 'IN_HOUSE_FABRICATION')
      .map(item => ({
        'Part / Model Name': item.name,
        'Fabrication Qty': item.requiredQuantity,
        'Process': item.sourcingChannel,
        'Material Specification': item.specification,
        'Target Class / Batch': item.targetClassOrProject,
        'Machine Queued [ ]': 'No',
        'QC Approved [ ]': 'No'
      }));
    const wsFab = XLSX.utils.json_to_sheet(fabItems.length > 0 ? fabItems : [{ 'Notice': 'No in-house fabrication required' }]);
    XLSX.utils.book_append_sheet(wb, wsFab, 'InHouse_Fabrication');

    // Generate output
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return out;
  }

  /**
   * Browser file download trigger for Excel
   */
  public static downloadExcel(summary: DispatchReportSummary, filename?: string): void {
    if (typeof window === 'undefined') return;
    const data = this.generateExcelWorkbook(summary);
    const blob = new Blob([data as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const name = filename || `${summary.documentRef}_${summary.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates formatted CSV string for universal spreadsheet imports
   */
  public static generateCsv(summary: DispatchReportSummary): string {
    const headers = [
      'SKU',
      'Name',
      'Category',
      'Specification',
      'Action Channel',
      'Required Qty',
      'Available Stock',
      'Deficit Qty',
      'Unit',
      'Unit Cost (INR)',
      'Total Cost (INR)',
      'Vendor / Location',
      'Lead Time (Days)',
      'Bin Location',
      'Target Class / Batch'
    ];

    const rows = summary.items.map(i => [
      `"${i.sku}"`,
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.category}"`,
      `"${i.specification.replace(/"/g, '""')}"`,
      `"${i.actionChannel}"`,
      i.requiredQuantity,
      i.availableStock,
      i.deficitQuantity,
      `"${i.unit}"`,
      i.unitCost,
      i.extendedCost,
      `"${i.vendorOrLocation.replace(/"/g, '""')}"`,
      i.leadTimeDays,
      `"${i.binLocation.replace(/"/g, '""')}"`,
      `"${i.targetClassOrProject.replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Browser download for CSV
   */
  public static downloadCsv(summary: DispatchReportSummary, filename?: string): void {
    if (typeof window === 'undefined') return;
    const csvContent = this.generateCsv(summary);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const name = filename || `${summary.documentRef}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates concise, copyable WhatsApp / Slack markdown text for team standup
   */
  public static generateWhatsAppSummaryText(summary: DispatchReportSummary): string {
    const lines: string[] = [];

    lines.push(`📦 *EXPERIMIND LABS — PROCUREMENT & PRODUCTION DISPATCH*`);
    lines.push(`📄 *Ref:* \`${summary.documentRef}\``);
    lines.push(`🎯 *Project:* ${summary.projectName} (${summary.batchMultiplier}x Batch)`);
    if (summary.clientName) lines.push(`🏢 *Client:* ${summary.clientName}`);
    lines.push(`👤 *Lead:* ${summary.leadUserName} | 📅 *Delivery:* ${summary.targetDeliveryDate}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📊 *READINESS & FINANCIAL SUMMARY:*`);
    lines.push(`• Total Line Items: *${summary.totalItems}*`);
    lines.push(`• 🟢 In-Stock & Ready: *${summary.inStockCount} items* (${summary.stockReadinessPct}% Coverage)`);
    lines.push(`• 🔵 Local Market Cash Buy: *${summary.localBuyCount} items* (~₹${summary.localPurchaseCashINR.toLocaleString('en-IN')})`);
    lines.push(`• 🟣 Vendor POs to Order: *${summary.toOrderCount} items* (~₹${summary.vendorOrdersTotalINR.toLocaleString('en-IN')})`);
    lines.push(`• 🟠 In-House Fabrication: *${summary.fabricationCount} jobs* (Laser/3D/Prep)`);
    lines.push(`• 💰 Total Estimated Procurement: *₹${summary.totalProcurementValueINR.toLocaleString('en-IN')}*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Top Local Buy Items
    const localItems = summary.items.filter(i => i.actionChannel === 'LOCAL_BUY');
    if (localItems.length > 0) {
      lines.push(`🔵 *LOCAL MARKET SHOPPING LIST (SP Road / Hardware):*`);
      localItems.slice(0, 8).forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.name} — *${item.deficitQuantity} ${item.unit}* (~₹${item.extendedCost})`);
      });
      if (localItems.length > 8) lines.push(`   _...and ${localItems.length - 8} more items._`);
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }

    // Top Vendor PO Items
    const vendorItems = summary.items.filter(i => i.actionChannel === 'TO_ORDER');
    if (vendorItems.length > 0) {
      lines.push(`🟣 *VENDOR PURCHASE ORDERS (Action Required):*`);
      vendorItems.slice(0, 8).forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.name} (${item.vendorOrLocation}) — *${item.deficitQuantity} ${item.unit}* (~₹${item.extendedCost}, Lead: ${item.leadTimeDays}d)`);
      });
      if (vendorItems.length > 8) lines.push(`   _...and ${vendorItems.length - 8} more items._`);
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }

    // In-House Fabrication
    const fabItems = summary.items.filter(i => i.actionChannel === 'IN_HOUSE_FABRICATION');
    if (fabItems.length > 0) {
      lines.push(`🟠 *WORKSHOP FABRICATION QUEUE:*`);
      fabItems.slice(0, 5).forEach((item, idx) => {
        lines.push(`• ${item.name} — *${item.requiredQuantity} units* (${item.specification})`);
      });
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }

    lines.push(`_Generated automatically by Experimind Labs Inventory System on ${summary.generatedAt}_`);
    return lines.join('\n');
  }
}
