/**
 * EcadParserService.ts
 * High-performance CAD / EDA Ingestion Service for KiCad, Altium Designer, EasyEDA / JLCPCB, Eagle, and CSV.
 * Features advanced Reference Designator Range Expansion (e.g. "R1-R5, C10, C12-C14" -> ["R1", "R2", "R3", "R4", "R5", "C10", "C12", "C13", "C14"]).
 */

export interface ParsedEcadRow {
  designators: string[];
  quantity: number;
  value?: string;
  footprint?: string;
  mpn?: string;
  manufacturer?: string;
  description?: string;
  dnp?: boolean;
  assemblyPhase?: string;
  parametricSpecs?: Record<string, any>;
  matchedItemId?: string;
}

export interface EcadParseResult {
  format: "KICAD" | "ALTIUM" | "EASYEDA" | "GENERIC";
  totalComponents: number;
  totalUniqueLines: number;
  rows: ParsedEcadRow[];
  warnings: string[];
}

export class EcadParserService {
  /**
   * Reference Designator Expansion Grammar
   * Expands complex EDA designator tokens into discrete individual designators.
   * e.g. "R1-R5, R8, R10-R12; C1-C3, C10" -> ["R1", "R2", "R3", "R4", "R5", "R8", "R10", "R11", "R12", "C1", "C2", "C3", "C10"]
   */
  public static expandDesignators(rawInput: string): string[] {
    if (!rawInput || typeof rawInput !== "string") return [];

    const cleaned = rawInput.trim();
    if (!cleaned) return [];

    // Split by common separators: comma, semicolon, whitespace, newline, tab
    const tokens = cleaned
      .split(/[\s,;\n\r\t]+/)
      .map((t) => t.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);

    const expanded: string[] = [];
    const seen = new Set<string>();

    for (const token of tokens) {
      // Check for range patterns: e.g. R1-R5, R1..R5, R1-5, R01-R04
      const rangeMatch = token.match(/^([A-Za-z]+)(\d+)\s*(?:[-–—]|\.\.)\s*(?:([A-Za-z]+))?(\d+)$/);

      if (rangeMatch) {
        const prefix1 = rangeMatch[1];
        const numStr1 = rangeMatch[2];
        const prefix2 = rangeMatch[3] || prefix1;
        const numStr2 = rangeMatch[4];

        // Ensure prefixes match (e.g. R1-R5 or R1-5)
        if (prefix1.toUpperCase() === prefix2.toUpperCase()) {
          const startNum = parseInt(numStr1, 10);
          const endNum = parseInt(numStr2, 10);

          if (!isNaN(startNum) && !isNaN(endNum)) {
            // Normal range with safety bound
            if (startNum <= endNum && endNum - startNum <= 5000) {
              const padLength = numStr1.startsWith("0") ? numStr1.length : 0;
              for (let i = startNum; i <= endNum; i++) {
                const formattedNum = padLength > 0 ? String(i).padStart(padLength, "0") : String(i);
                const des = `${prefix1.toUpperCase()}${formattedNum}`;
                if (!seen.has(des)) {
                  seen.add(des);
                  expanded.push(des);
                }
              }
              continue;
            } else if (startNum > endNum) {
              // Inverted range fallback: add both discrete points
              const des1 = `${prefix1.toUpperCase()}${numStr1}`;
              const des2 = `${prefix2.toUpperCase()}${numStr2}`;
              if (!seen.has(des1)) { seen.add(des1); expanded.push(des1); }
              if (!seen.has(des2)) { seen.add(des2); expanded.push(des2); }
              continue;
            }
          }
        }
      }

      // Single designator fallback
      const singleMatch = token.match(/^([A-Za-z]+\d+)/);
      const des = singleMatch ? singleMatch[1].toUpperCase() : token.toUpperCase();
      if (des && !seen.has(des)) {
        seen.add(des);
        expanded.push(des);
      }
    }

    return expanded;
  }

  /**
   * Footprint Normalizer
   * Extracts clean industry standard package footprints from EDA 3D library identifiers.
   * e.g. "Resistor_SMD:R_0603_1608Metric" -> "0603"
   */
  public static normalizeFootprint(rawFootprint: string): string {
    if (!rawFootprint) return "OTHER";

    const fp = rawFootprint.trim();

    // Standard SMD Chip footprints: 0201, 0402, 0603, 0805, 1206, 1210, 2010, 2512
    const chipMatch = fp.match(/(?:R_|C_|L_|D_)?(01005|0201|0402|0603|0805|1206|1210|2010|2512)/i);
    if (chipMatch) return chipMatch[1];

    // Standard IC Footprints
    if (/QFN[-_]?\d+/i.test(fp)) return fp.match(/QFN[-_]?\d+/i)![0].toUpperCase();
    if (/LQFP[-_]?\d+/i.test(fp)) return fp.match(/LQFP[-_]?\d+/i)![0].toUpperCase();
    if (/TQFP[-_]?\d+/i.test(fp)) return fp.match(/TQFP[-_]?\d+/i)![0].toUpperCase();
    if (/SOIC[-_]?\d+/i.test(fp)) return fp.match(/SOIC[-_]?\d+/i)![0].toUpperCase();
    if (/SOP[-_]?\d+/i.test(fp)) return fp.match(/SOP[-_]?\d+/i)![0].toUpperCase();
    if (/SSOP[-_]?\d+/i.test(fp)) return fp.match(/SSOP[-_]?\d+/i)![0].toUpperCase();
    if (/TSSOP[-_]?\d+/i.test(fp)) return fp.match(/TSSOP[-_]?\d+/i)![0].toUpperCase();
    if (/SOT[-_]?23[-_]?\d*/i.test(fp)) return fp.match(/SOT[-_]?23[-_]?\d*/i)![0].toUpperCase();
    if (/SOT[-_]?223/i.test(fp)) return "SOT-223";
    if (/DIP[-_]?\d+/i.test(fp)) return fp.match(/DIP[-_]?\d+/i)![0].toUpperCase();
    if (/TO[-_]?220/i.test(fp)) return "TO-220";
    if (/MODULE/i.test(fp)) return "MODULE";

    // Strip library prefix if present (e.g. Package_SO:SOIC-8 -> SOIC-8)
    const stripped = fp.split(":").pop()?.split("_")[0] || fp;
    return stripped.length > 0 ? stripped : "OTHER";
  }

  /**
   * Parse CSV/TSV contents and extract BOM rows with auto-detected format
   */
  public static parseCsvContent(
    fileContent: string,
    formatHint: "AUTO" | "KICAD" | "ALTIUM" | "EASYEDA" | "GENERIC" = "AUTO"
  ): EcadParseResult {
    const lines = fileContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return { format: "GENERIC", totalComponents: 0, totalUniqueLines: 0, rows: [], warnings: ["Empty file"] };
    }

    // Parse CSV line handling quotes
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if ((char === "," || char === "\t") && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      return result;
    };

    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase());

    // Format Detection
    let detectedFormat: "KICAD" | "ALTIUM" | "EASYEDA" | "GENERIC" = "GENERIC";

    if (formatHint !== "AUTO") {
      detectedFormat = formatHint;
    } else {
      const headerStr = headers.join(" ");
      if (headerStr.includes("jlcpcb") || (headerStr.includes("device") && headerStr.includes("package"))) {
        detectedFormat = "EASYEDA";
      } else if (headerStr.includes("designation") || headerStr.includes("supplier and ref") || headerStr.includes("kicad")) {
        detectedFormat = "KICAD";
      } else if (headerStr.includes("comment") && headerStr.includes("description") && headerStr.includes("manufacturer part number")) {
        detectedFormat = "ALTIUM";
      } else if (headers.some((h) => h.includes("ref") || h.includes("designat"))) {
        detectedFormat = "KICAD";
      }
    }

    // Column Mapping Indices
    let designatorIdx = -1;
    let qtyIdx = -1;
    let valueIdx = -1;
    let footprintIdx = -1;
    let mpnIdx = -1;
    let descIdx = -1;

    headers.forEach((h, idx) => {
      if (h.includes("designator") || h.includes("reference") || h.includes("ref des") || h === "ref") {
        designatorIdx = idx;
      } else if (h === "quantity" || h === "qty" || h.includes("count")) {
        qtyIdx = idx;
      } else if (h === "value" || h === "comment" || h === "designation" || h === "device") {
        valueIdx = idx;
      } else if (h === "footprint" || h === "package" || h.includes("pkg")) {
        footprintIdx = idx;
      } else if (
        h.includes("mpn") ||
        h.includes("part number") ||
        h.includes("manufacturer part") ||
        h.includes("supplier and ref") ||
        h.includes("part#") ||
        h.includes("jlcpcb part")
      ) {
        mpnIdx = idx;
      } else if (h.includes("description") || h.includes("desc")) {
        descIdx = idx;
      }
    });

    if (designatorIdx === -1) {
      // Fallback: search for first column containing designator-like values
      designatorIdx = 0;
    }

    const rows: ParsedEcadRow[] = [];
    const warnings: string[] = [];
    let totalComponents = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length <= designatorIdx) continue;

      const rawDesignators = cols[designatorIdx] || "";
      const designators = this.expandDesignators(rawDesignators);
      if (designators.length === 0) continue;

      const rawQty = qtyIdx !== -1 && cols[qtyIdx] ? parseInt(cols[qtyIdx], 10) : NaN;
      const quantity = !isNaN(rawQty) && rawQty > 0 ? rawQty : designators.length;

      const value = valueIdx !== -1 ? cols[valueIdx] : undefined;
      const rawFootprint = footprintIdx !== -1 ? cols[footprintIdx] : "";
      const footprint = this.normalizeFootprint(rawFootprint);
      const mpn = mpnIdx !== -1 ? cols[mpnIdx] : value;
      const description = descIdx !== -1 ? cols[descIdx] : undefined;

      const isDnp = /DNP|DNI|NO POP/i.test(`${value || ""} ${description || ""}`);
      const parametricSpecs = this.inferParametricSpecs(value || "", footprint, description);

      totalComponents += quantity;

      rows.push({
        designators,
        quantity,
        value,
        footprint,
        mpn,
        description,
        dnp: isDnp,
        assemblyPhase: "SMT_TOP",
        parametricSpecs,
      });
    }

    return {
      format: detectedFormat,
      totalComponents,
      totalUniqueLines: rows.length,
      rows,
      warnings,
    };
  }

  /**
   * Infer parametric specifications from component value and footprint
   */
  public static inferParametricSpecs(
    value: string,
    footprint: string,
    description?: string
  ): Record<string, any> {
    const specs: Record<string, any> = { footprint };

    const fullText = `${value} ${description || ""}`.trim();

    // Resistance: e.g. 10k, 4.7k, 100R, 0R, 1M, 10k 1%
    const resMatch = fullText.match(/(\d+(?:\.\d+)?)\s*([kKmM]?[rR]|ohms?|[kKmM]Ω?)/);
    if (resMatch) {
      specs.type = "RESISTOR";
      specs.resistance = `${resMatch[1]}${resMatch[2]}`;
    }

    // Capacitance: e.g. 100nF, 10uF, 22pF, 4.7uF 50V
    const capMatch = fullText.match(/(\d+(?:\.\d+)?)\s*([pnumµ]F)/i);
    if (capMatch) {
      specs.type = "CAPACITOR";
      specs.capacitance = `${capMatch[1]}${capMatch[2]}`;
    }

    // Tolerance: e.g. 1%, 5%, 0.1%
    const tolMatch = fullText.match(/(\d+(?:\.\d+)?)\s*%/);
    if (tolMatch) {
      specs.tolerance = `${tolMatch[1]}%`;
    }

    // Voltage rating: e.g. 50V, 25V, 16V, 6.3V
    const voltMatch = fullText.match(/(\d+(?:\.\d+)?)\s*V/i);
    if (voltMatch) {
      specs.voltage = `${voltMatch[1]}V`;
    }

    // Dielectric: X7R, X5R, C0G, NP0
    const dielMatch = fullText.match(/(X7R|X5R|C0G|NP0|Y5V)/i);
    if (dielMatch) {
      specs.dielectric = dielMatch[1].toUpperCase();
    }

    return specs;
  }

  /**
   * Calculate Diff between an existing active BOM revision and a newly uploaded CAD BOM
   */
  public static diffBoms(
    existingNodes: Array<{ id: string; child_item?: any; reference_designators?: string[]; quantity: number }>,
    parsedCadRows: ParsedEcadRow[]
  ) {
    const added: ParsedEcadRow[] = [];
    const modified: Array<{ existing: any; updated: ParsedEcadRow; diffFields: string[] }> = [];
    const unchanged: Array<{ existing: any; cad: ParsedEcadRow }> = [];
    const removed: any[] = [];

    const existingByDesignator = new Map<string, any>();
    existingNodes.forEach((node) => {
      const designators = Array.isArray(node.reference_designators) ? node.reference_designators : [];
      designators.forEach((d) => existingByDesignator.set(d.toUpperCase(), node));
    });

    const processedExistingNodeIds = new Set<string>();

    for (const cadRow of parsedCadRows) {
      const primaryDes = cadRow.designators[0]?.toUpperCase();
      const existingMatch = primaryDes ? existingByDesignator.get(primaryDes) : null;

      if (!existingMatch) {
        added.push(cadRow);
      } else {
        processedExistingNodeIds.add(existingMatch.id);
        const diffFields: string[] = [];

        if (existingMatch.quantity !== cadRow.quantity) diffFields.push("quantity");
        
        const existingDesStr = (existingMatch.reference_designators || []).sort().join(",");
        const cadDesStr = [...cadRow.designators].sort().join(",");
        if (existingDesStr !== cadDesStr) diffFields.push("reference_designators");

        if (diffFields.length > 0) {
          modified.push({ existing: existingMatch, updated: cadRow, diffFields });
        } else {
          unchanged.push({ existing: existingMatch, cad: cadRow });
        }
      }
    }

    for (const node of existingNodes) {
      if (!processedExistingNodeIds.has(node.id)) {
        removed.push(node);
      }
    }

    return { added, modified, removed, unchanged };
  }
}
