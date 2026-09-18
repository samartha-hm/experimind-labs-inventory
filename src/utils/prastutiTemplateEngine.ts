import * as XLSX from 'xlsx';
import { PRASTUTI_PROJECTS_DATA, PrastutiProjectKit, PrastutiKitItem } from '../data/prastutiKitsData';

export interface PrastutiTemplateRow {
  activityName: string;
  materialDescription: string;
  toOrder: boolean;
  laserCutting: boolean;
  inStock: boolean;
  prepare: boolean;
  qtyPerKit?: number;
  unit?: string;
  unitCost?: number;
  stockAvailable?: number;
  channel?: 'vendor_po' | 'laser_cutting' | 'in_stock' | 'lab_prepare' | 'local_buy';
  category?: string;
  specification?: string;
}

export interface ParsedPrastutiProject {
  id: string;
  grade: string;
  name: string;
  description: string;
  rows: PrastutiTemplateRow[];
  summary: {
    totalItems: number;
    toOrderCount: number;
    laserCuttingCount: number;
    inStockCount: number;
    prepareCount: number;
  };
}

/**
 * Normalizes boolean strings like 'yes', 'no', 'y', 'n', 'true', 'false', '1', '0'
 */
export function normalizeBooleanCell(val: any): boolean {
  if (val === true || val === 1) return true;
  if (val === false || val === 0 || val == null) return false;
  const str = String(val).trim().toLowerCase();
  return str === 'yes' || str === 'y' || str === 'true' || str === '1';
}

/**
 * Parses an Excel (.xlsx / .xls) or CSV buffer into standard Prastuti projects
 */
export function parsePrastutiSpreadsheet(data: ArrayBuffer | Uint8Array): ParsedPrastutiProject[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const projects: ParsedPrastutiProject[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) continue;

    // Detect header row (first row with 'Activity' or 'Component' or 'Material')
    let headerRowIndex = -1;
    let colMap = {
      activity: 0,
      material: 1,
      toOrder: 2,
      laserCutting: 3,
      inStock: 4,
      prepare: 5,
      qty: -1,
      unit: -1,
      cost: -1
    };

    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r].map((cell: any) => String(cell || '').trim().toLowerCase());
      const actIdx = row.findIndex((c: string) => c.includes('activity'));
      const matIdx = row.findIndex((c: string) => c.includes('component') || c.includes('material') || c.includes('description') || c.includes('item'));

      if (actIdx !== -1 || matIdx !== -1) {
        headerRowIndex = r;
        colMap.activity = actIdx !== -1 ? actIdx : 0;
        colMap.material = matIdx !== -1 ? matIdx : 1;

        // Map rest of columns
        row.forEach((colName: string, idx: number) => {
          if (colName.includes('order') || colName.includes('purchase') || colName.includes('buy')) colMap.toOrder = idx;
          if (colName.includes('laser') || colName.includes('cut') || colName.includes('fab')) colMap.laserCutting = idx;
          if (colName.includes('stock')) colMap.inStock = idx;
          if (colName.includes('prep')) colMap.prepare = idx;
          if (colName.includes('qty') || colName.includes('quantity')) colMap.qty = idx;
          if (colName.includes('unit') && !colName.includes('cost')) colMap.unit = idx;
          if (colName.includes('cost') || colName.includes('price')) colMap.cost = idx;
        });
        break;
      }
    }

    const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;
    const parsedRows: PrastutiTemplateRow[] = [];
    let currentActivity = 'General Science Curriculum';

    for (let r = startRow; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const actCell = String(row[colMap.activity] || '').trim();
      const matCell = String(row[colMap.material] || '').trim();

      if (actCell) {
        currentActivity = actCell;
      }

      if (!matCell && !actCell) continue;
      if (!matCell && actCell) {
        // May be a sub-header row
        continue;
      }

      const toOrder = normalizeBooleanCell(row[colMap.toOrder]);
      const laserCutting = normalizeBooleanCell(row[colMap.laserCutting]);
      const inStock = normalizeBooleanCell(row[colMap.inStock]);
      const prepare = normalizeBooleanCell(row[colMap.prepare]);

      let channel: PrastutiTemplateRow['channel'] = 'in_stock';
      if (laserCutting) channel = 'laser_cutting';
      else if (prepare) channel = 'lab_prepare';
      else if (toOrder) channel = 'vendor_po';
      else if (inStock) channel = 'in_stock';

      parsedRows.push({
        activityName: actCell || currentActivity,
        materialDescription: matCell,
        toOrder,
        laserCutting,
        inStock,
        prepare,
        qtyPerKit: colMap.qty !== -1 && Number(row[colMap.qty]) > 0 ? Number(row[colMap.qty]) : 1,
        unit: colMap.unit !== -1 && row[colMap.unit] ? String(row[colMap.unit]).trim() : 'units',
        unitCost: colMap.cost !== -1 && Number(row[colMap.cost]) > 0 ? Number(row[colMap.cost]) : 50,
        channel
      });
    }

    if (parsedRows.length > 0) {
      const toOrderCount = parsedRows.filter((r) => r.toOrder).length;
      const laserCuttingCount = parsedRows.filter((r) => r.laserCutting).length;
      const inStockCount = parsedRows.filter((r) => r.inStock).length;
      const prepareCount = parsedRows.filter((r) => r.prepare).length;

      const gradeKey = sheetName.toLowerCase().includes('8') ? '8th' : sheetName.toLowerCase().includes('9') ? '9th' : sheetName.toLowerCase().includes('10') ? '10th' : sheetName;

      projects.push({
        id: `imported-${sheetName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        grade: gradeKey,
        name: `${sheetName} Prastuti Experiential Science Kit`,
        description: `Imported standardized curriculum dataset with ${parsedRows.length} material lines across ${new Set(parsedRows.map((r) => r.activityName)).size} classroom activities.`,
        rows: parsedRows,
        summary: {
          totalItems: parsedRows.length,
          toOrderCount,
          laserCuttingCount,
          inStockCount,
          prepareCount
        }
      });
    }
  }

  return projects;
}

/**
 * Downloads a standardized 6-column Excel template with sample sheets for 8th, 9th, and 10th grades
 */
export function downloadStandardPrastutiTemplateXlsx(): void {
  const wb = XLSX.utils.book_new();

  for (const kit of PRASTUTI_PROJECTS_DATA) {
    const wsData: any[][] = [];

    // Title Row
    wsData.push([`${kit.grade} prastuti science kit`]);

    // Header Row
    wsData.push([
      'Activity name',
      'Component / Material Description',
      'to order/purchase',
      'laser cutting',
      'in stock',
      'prepare'
    ]);

    // Item Rows
    kit.items.forEach((item) => {
      wsData.push([
        item.activityName,
        item.materialName + (item.specification ? ` (${item.specification})` : ''),
        item.toOrder ? 'yes' : 'no',
        item.laserCutting ? 'yes' : 'no',
        item.inStock ? 'yes' : 'no',
        item.prepare ? 'yes' : 'no'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set Column Widths
    ws['!cols'] = [
      { wch: 45 }, // Activity name
      { wch: 45 }, // Component / Material Description
      { wch: 18 }, // to order/purchase
      { wch: 15 }, // laser cutting
      { wch: 12 }, // in stock
      { wch: 12 }  // prepare
    ];

    XLSX.utils.book_append_sheet(wb, ws, kit.grade);
  }

  const filename = `Experimind_Prastuti_Standard_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Converts Prastuti project dataset into standardized KitBOM format for platform integration
 */
export function convertPrastutiKitToPlatformBOM(project: PrastutiProjectKit | ParsedPrastutiProject) {
  const rows: PrastutiTemplateRow[] = 'items' in project
    ? (project as PrastutiProjectKit).items.map((i) => ({
        activityName: i.activityName,
        materialDescription: i.materialName,
        toOrder: i.toOrder,
        laserCutting: i.laserCutting,
        inStock: i.inStock,
        prepare: i.prepare,
        qtyPerKit: i.qtyPerKit,
        unit: i.unit,
        unitCost: i.unitCost,
        channel: i.channel,
        category: i.category,
        specification: i.specification
      }))
    : (project as ParsedPrastutiProject).rows;

  return {
    id: project.id,
    sku: 'sku' in project ? (project as PrastutiProjectKit).sku : `EXP-KIT-${project.grade.toUpperCase()}`,
    name: project.name,
    description: project.description,
    grade: project.grade,
    rows
  };
}
