import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parsePrastutiSpreadsheet,
  normalizeBooleanCell,
  convertPrastutiKitToPlatformBOM
} from '../prastutiTemplateEngine';
import { PRASTUTI_PROJECTS_DATA } from '../../data/prastutiKitsData';
import { DispatchPdfService } from '../../services/DispatchPdfService';
import { DispatchReportService } from '../../services/DispatchReportService';
import { INITIAL_PROJECTS } from '../../data/projectsDataset';

describe('Prastuti Standard Template Engine & Science Kits', () => {
  it('correctly normalizes boolean cells from Excel inputs', () => {
    expect(normalizeBooleanCell('yes')).toBe(true);
    expect(normalizeBooleanCell('YES')).toBe(true);
    expect(normalizeBooleanCell('y')).toBe(true);
    expect(normalizeBooleanCell('true')).toBe(true);
    expect(normalizeBooleanCell(1)).toBe(true);

    expect(normalizeBooleanCell('no')).toBe(false);
    expect(normalizeBooleanCell('NO')).toBe(false);
    expect(normalizeBooleanCell('n')).toBe(false);
    expect(normalizeBooleanCell('false')).toBe(false);
    expect(normalizeBooleanCell(0)).toBe(false);
    expect(normalizeBooleanCell('')).toBe(false);
    expect(normalizeBooleanCell(null)).toBe(false);
  });

  it('contains complete curriculum data for Grade 8, Grade 9, and Grade 10', () => {
    expect(PRASTUTI_PROJECTS_DATA.length).toBe(3);

    const g8 = PRASTUTI_PROJECTS_DATA.find((p) => p.grade === '8th');
    const g9 = PRASTUTI_PROJECTS_DATA.find((p) => p.grade === '9th');
    const g10 = PRASTUTI_PROJECTS_DATA.find((p) => p.grade === '10th');

    expect(g8).toBeDefined();
    expect(g8!.items.length).toBeGreaterThanOrEqual(10);

    expect(g9).toBeDefined();
    expect(g9!.items.length).toBeGreaterThanOrEqual(10);

    expect(g10).toBeDefined();
    expect(g10!.items.length).toBeGreaterThanOrEqual(15);
    expect(g10!.items.some((i) => i.materialName.includes('Zinc Granules'))).toBe(true);
    expect(g10!.items.some((i) => i.materialName.includes('Phenolphthalein'))).toBe(true);
  });

  it('parses multi-sheet 6-column Excel workbook into projects', () => {
    // Generate an in-memory workbook with 8th and 10th sheets
    const wb = XLSX.utils.book_new();

    const sample10thData = [
      ['10th prastuti science kit'],
      ['Activity name', 'Component / Material Description', 'to order/purchase', 'laser cutting', 'in stock', 'prepare'],
      ['Observing Indicators of a Chemical Reaction', 'Zinc granules', 'yes', 'no', 'no', 'no'],
      ['Observing Indicators of a Chemical Reaction', 'Phenolphthalein indicator', 'no', 'no', 'no', 'yes'],
      ['Combustion Reaction', 'Sandpaper', 'no', 'no', 'yes', 'no'],
      ['Apparatus Mount', 'Laser Cut 6-Well Rack', 'no', 'yes', 'no', 'no']
    ];

    const ws = XLSX.utils.aoa_to_sheet(sample10thData);
    XLSX.utils.book_append_sheet(wb, ws, '10th');

    const wbArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parsedProjects = parsePrastutiSpreadsheet(wbArray);

    expect(parsedProjects.length).toBe(1);
    expect(parsedProjects[0].grade).toBe('10th');
    expect(parsedProjects[0].rows.length).toBe(4);

    const zincRow = parsedProjects[0].rows.find((r) => r.materialDescription === 'Zinc granules');
    expect(zincRow).toBeDefined();
    expect(zincRow!.toOrder).toBe(true);
    expect(zincRow!.channel).toBe('vendor_po');

    const phenRow = parsedProjects[0].rows.find((r) => r.materialDescription === 'Phenolphthalein indicator');
    expect(phenRow).toBeDefined();
    expect(phenRow!.prepare).toBe(true);
    expect(phenRow!.channel).toBe('lab_prepare');

    const rackRow = parsedProjects[0].rows.find((r) => r.materialDescription === 'Laser Cut 6-Well Rack');
    expect(rackRow).toBeDefined();
    expect(rackRow!.laserCutting).toBe(true);
    expect(rackRow!.channel).toBe('laser_cutting');
  });

  it('integrates 3 Prastuti projects into INITIAL_PROJECTS', () => {
    const prj8 = INITIAL_PROJECTS.find((p) => p.id === 'PRJ-PRASTUTI-G8');
    const prj9 = INITIAL_PROJECTS.find((p) => p.id === 'PRJ-PRASTUTI-G9');
    const prj10 = INITIAL_PROJECTS.find((p) => p.id === 'PRJ-PRASTUTI-G10');

    expect(prj8).toBeDefined();
    expect(prj9).toBeDefined();
    expect(prj10).toBeDefined();

    expect(prj10!.classes[0].items.length).toBeGreaterThanOrEqual(15);
  });

  it('generates Laser Cutting and Lab Preparation Dispatch PDFs cleanly', () => {
    const rep = DispatchReportService.buildProductionMatrixDispatchReport(5, 'ALL');
    expect(rep).toBeDefined();

    const laserPdf = DispatchPdfService.createDispatchPdf(rep, {
      documentType: 'LASER_CUTTING'
    });
    expect(laserPdf).toBeDefined();

    const labPdf = DispatchPdfService.createDispatchPdf(rep, {
      documentType: 'LAB_PREPARATION'
    });
    expect(labPdf).toBeDefined();
  });
});
