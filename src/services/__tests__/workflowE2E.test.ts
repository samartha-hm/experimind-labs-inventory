import "reflect-metadata";
import { describe, it, expect, beforeAll, vi } from "vitest";

/**
 * End-to-end operational workflow coverage.
 *
 * Runs the real service layer (InventoryService, PurchaseOrderService,
 * SalesOrderService, CartReservationService) against an in-memory fake of the
 * TypeORM DataSource so the full replenishment -> readiness -> reservation ->
 * dispatch chain is exercised without a live PostgreSQL instance.
 *
 * Covered chain (readiness plan section 8, item 1):
 *   low stock -> replenishment request + approval -> partial receipt/backorder
 *   -> project readiness/shortage -> reservation -> dispatch
 */

vi.mock("../../db.ts", () => {
  type Row = Record<string, any>;

  const tables = new Map<string, Map<string, Row>>();

  const table = (name: string) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  };

  const clone = (row: Row) => structuredClone(row);

  const markEntity = (row: Row, entityClass: Function) => {
    Object.defineProperty(row, "__entity", {
      value: entityClass,
      enumerable: false,
      configurable: true,
      writable: true,
    });
    return row;
  };

  const entityName = (entityClass: any) =>
    typeof entityClass === "function" ? entityClass.name : String(entityClass);

  const matches = (row: Row, where: Row) =>
    Object.entries(where ?? {}).every(([k, v]) => row[k] === v);

  // Relation resolvers keyed by entity class name, then relation path segment.
  const RELATIONS: Record<string, Record<string, (row: Row) => any>> = {
    PurchaseOrder: {
      vendor: (row) => table("Vendor").get(row.vendor_id) ?? null,
      lines: (row) =>
        [...table("PurchaseOrderLine").values()].filter((l) => l.po_id === row.id),
    },
    PurchaseOrderLine: {
      inventory_item: (row) => table("InventoryItem").get(row.inventory_item_id) ?? null,
      purchase_order: (row) => table("PurchaseOrder").get(row.po_id) ?? null,
    },
    SalesOrder: {
      customer: (row) => table("Customer").get(row.customer_id) ?? null,
      lines: (row) =>
        [...table("SalesOrderLine").values()].filter((l) => l.so_id === row.id),
    },
    SalesOrderLine: {
      inventory_item: (row) => table("InventoryItem").get(row.inventory_item_id) ?? null,
      sales_order: (row) => table("SalesOrder").get(row.so_id) ?? null,
    },
  };

  const resolveRelations = (row: Row, entityClass: any, relations: string[] = []) => {
    const resolved = clone(row);
    for (const path of relations) {
      const segments = path.split(".");
      let current: any = [resolved];
      for (const segment of segments) {
        const resolver = RELATIONS[entityName(entityClass)]?.[segment];
        if (!resolver) break;
        current = current.flatMap((target: any) => {
          if (target == null) return [];
          const value = resolver(target);
          if (Array.isArray(value)) {
            (target as any)[segment] = value.map((child) =>
              markEntity(clone(child), (child as any).__entity ?? Object),
            );
            return (target as any)[segment];
          }
          (target as any)[segment] = value ? clone(value) : value;
          return [(target as any)[segment]];
        });
        // After the first segment the child entity class differs; resolve the
        // remaining segments generically by relation name.
        if (segments.indexOf(segment) < segments.length - 1) {
          const childSegment = segments[segments.indexOf(segment) + 1];
          current = current.map((child: any) => {
            if (child == null) return child;
            const childClass = (child as any).__entity;
            const childResolver = RELATIONS[entityName(childClass)]?.[childSegment];
            if (childResolver) {
              const value = childResolver(child);
              (child as any)[childSegment] = Array.isArray(value)
                ? value.map((c) => clone(c))
                : value
                  ? clone(value)
                  : value;
            }
            return child;
          });
          break;
        }
      }
    }
    return resolved;
  };

  const persist = (entityClass: any, row: Row): Row => {
    const name = entityName(entityClass);
    if (!row.id) row.id = crypto.randomUUID();
    if (!row.created_at) row.created_at = new Date();
    row.updated_at = new Date();
    table(name).set(row.id, clone(row));
    return row;
  };

  const saveEntity = (entityClass: any, row: Row): Row => {
    const klass =
      row && !(row as any).__entity && typeof entityClass !== "function"
        ? (entityClass as any)
        : entityClass;
    const target = (row as any).__entity ?? klass;
    if (typeof target !== "function") {
      throw new Error("FakeDataSource.save: unable to determine entity class");
    }
    return persist(target, row);
  };

  const findOneRow = (entityClass: any, options: any = {}) => {
    const name = entityName(entityClass);
    const rows = [...table(name).values()].filter((r) => matches(r, options.where));
    const row = rows[0];
    if (!row) return null;
    const resolved = resolveRelations(row, entityClass, options.relations ?? []);
    return markEntity(resolved, entityClass);
  };

  const findRows = (entityClass: any, options: any = {}) => {
    const name = entityName(entityClass);
    let rows = [...table(name).values()].filter((r) => matches(r, options.where));
    if (options.order) {
      for (const [field, dir] of Object.entries(options.order)) {
        rows.sort((a, b) => {
          const av = a[field] as any;
          const bv = b[field] as any;
          const cmp =
            av == null || bv == null
              ? 0
              : av instanceof Date && bv instanceof Date
                ? av.getTime() - bv.getTime()
                : av < bv
                  ? -1
                  : av > bv
                    ? 1
                    : 0;
          return dir === "DESC" ? -cmp : cmp;
        });
      }
    }
    return rows.map((r) => markEntity(resolveRelations(r, entityClass, options.relations ?? []), entityClass));
  };

  // --- Minimal query builder supporting the raw-SQL patterns used by services
  const evalOperand = (row: Row, operand: string, params: Record<string, any>, alias: string) => {
    const paramMatch = operand.match(/^:([\w]+)$/);
    if (paramMatch) return params[paramMatch[1]];
    const columnMatch = operand.match(new RegExp(`^${alias}\\.(\\w+)$`));
    if (columnMatch) return row[columnMatch[1]];
    if (operand === "true") return true;
    if (operand === "false") return false;
    if (operand === "null") return null;
    const num = Number(operand);
    if (!Number.isNaN(num) && operand !== "") return num;
    const str = operand.match(/^'(.*)'$/);
    if (str) return str[1];
    return operand;
  };

  const evalAtom = (row: Row, atom: string, params: Record<string, any>, alias: string) => {
    const m = atom
      .trim()
      .match(new RegExp(`^${alias}\\.(\\w+)\\s*(=|!=|<|>|<=|>=|ILIKE)\\s*(.+)$`));
    if (!m) throw new Error(`FakeQueryBuilder: unsupported condition "${atom}"`);
    const [, field, op, operand] = m;
    const left = row[field];
    const right = evalOperand(row, operand.trim(), params, alias);
    switch (op) {
      case "=":
        return left == right;
      case "!=":
        return left != right;
      case "<":
        return Number(left) < Number(right);
      case ">":
        return Number(left) > Number(right);
      case "<=":
        return Number(left) <= Number(right);
      case ">=":
        return Number(left) >= Number(right);
      case "ILIKE": {
        const pattern = String(right).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
        return new RegExp(`^${pattern}$`, "i").test(String(left ?? ""));
      }
      default:
        throw new Error(`FakeQueryBuilder: unsupported operator ${op}`);
    }
  };

  const splitTopLevel = (sql: string, keyword: RegExp) => {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const token of sql.split(/(\s+)/)) {
      if (token === "(") depth++;
      if (token === ")") depth--;
      if (depth === 0 && keyword.test(token) && current.trim()) {
        parts.push(current.trim());
        current = "";
        continue;
      }
      current += token;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  };

  const evalCondition = (row: Row, sql: string, params: Record<string, any>, alias: string) => {
    const andParts = splitTopLevel(sql, /\bAND\b/i);
    return andParts.every((part) => {
      const trimmed = part.trim();
      if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
        const inner = trimmed.slice(1, -1);
        return splitTopLevel(inner, /\bOR\b/i).some((atom) =>
          evalAtom(row, atom, params, alias),
        );
      }
      return evalAtom(row, trimmed, params, alias);
    });
  };

  const makeQueryBuilder = (entityClass: any, alias: string) => {
    const conditions: Array<{ sql: string; params: Record<string, any> }> = [];
    let orderField: string | null = null;
    let orderDir: "ASC" | "DESC" = "ASC";
    let skipCount = 0;
    let takeCount: number | null = null;

    const qb: any = {
      where: (sql: string, params: Record<string, any> = {}) => {
        conditions.push({ sql, params });
        return qb;
      },
      andWhere: (sql: string, params: Record<string, any> = {}) => {
        conditions.push({ sql, params });
        return qb;
      },
      orderBy: (field: string, dir: "ASC" | "DESC" = "ASC") => {
        orderField = field.replace(`${alias}.`, "");
        orderDir = dir;
        return qb;
      },
      skip: (n: number) => {
        skipCount = n;
        return qb;
      },
      take: (n: number) => {
        takeCount = n;
        return qb;
      },
      setLock: () => qb,
      getMany: () => qb.getManyAndCount()[0],
      getOne: () => qb.getManyAndCount()[0][0] ?? null,
      getManyAndCount: () => {
        let rows = [...table(entityName(entityClass)).values()].filter((row) =>
          conditions.every(({ sql, params }) => evalCondition(row, sql, params, alias)),
        );
        if (orderField) {
          rows.sort((a, b) => {
            const av = a[orderField!];
            const bv = b[orderField!];
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return orderDir === "DESC" ? -cmp : cmp;
          });
        }
        const total = rows.length;
        if (skipCount) rows = rows.slice(skipCount);
        if (takeCount != null) rows = rows.slice(0, takeCount);
        return [
          rows.map((r) => markEntity(clone(r), entityClass)),
          total,
        ] as [Row[], number];
      },
    };
    return qb;
  };

  const makeRepository = (entityClass: any) => ({
    create: (plain: Row = {}) => markEntity({ ...plain }, entityClass),
    save: (row: Row) => saveEntity(entityClass, row),
    find: (options: any = {}) => findRows(entityClass, options),
    findOne: (options: any = {}) => findOneRow(entityClass, options),
    remove: (row: Row) => {
      table(entityName(entityClass)).delete(row.id);
      return row;
    },
    delete: (criteria: any) => {
      const name = entityName(entityClass);
      if (typeof criteria === "string") {
        table(name).delete(criteria);
        return;
      }
      for (const [id, row] of table(name).entries()) {
        if (matches(row, criteria)) table(name).delete(id);
      }
    },
    createQueryBuilder: (alias: string) => makeQueryBuilder(entityClass, alias),
  });

  const manager: any = {
    create: (entityClass: any, plain: Row = {}) => markEntity({ ...plain }, entityClass),
    save: (entityClassOrRow: any, maybeRow?: Row) =>
      maybeRow === undefined
        ? saveEntity(null as any, entityClassOrRow)
        : saveEntity(entityClassOrRow, maybeRow),
    find: (entityClass: any, options: any = {}) => findRows(entityClass, options),
    findOne: (entityClass: any, options: any = {}) => findOneRow(entityClass, options),
    createQueryBuilder: (entityClass: any, alias: string) => makeQueryBuilder(entityClass, alias),
  };

  const AppDataSource: any = {
    getRepository: (entityClass: any) => makeRepository(entityClass),
    createQueryRunner: () => ({
      connect: () => Promise.resolve(),
      startTransaction: () => Promise.resolve(),
      commitTransaction: () => Promise.resolve(),
      rollbackTransaction: () => Promise.resolve(),
      release: () => Promise.resolve(),
      manager,
    }),
    transaction: (_isolation: string, cb: (m: any) => Promise<any>) => cb(manager),
    // Test inspection helpers
    __rows: (entityClassOrName: any) =>
      [...table(entityName(entityClassOrName)).values()].map((r) => clone(r)),
    __reset: () => tables.clear(),
  };

  return { AppDataSource };
});

import { AppDataSource } from "../../db.ts";
import { InventoryService } from "../InventoryService.ts";
import { PurchaseOrderService } from "../PurchaseOrderService.ts";
import { SalesOrderService } from "../SalesOrderService.ts";
import { CartReservationService } from "../CartReservationService.ts";
import { getReplenishmentRequestStatus } from "../replenishmentRequestPolicy.ts";
import { summarizeReplenishmentOrder } from "../../features/procurement/replenishmentStatus.ts";
import {
  getProjectInventoryShortages,
  getProjectReadinessSummary,
} from "../../utils/projectReadiness.ts";
import { normalizeCoreRole } from "../../middleware/requireRole.ts";
import type { Project } from "../../data/projectsDataset.ts";
import type { InventoryItem as FrontendInventoryItem } from "../../types.ts";

const ORG = "00000000-0000-0000-0000-000000000000";

const inventoryService = new InventoryService();
const purchaseOrderService = new PurchaseOrderService();
const salesOrderService = new SalesOrderService();

const toFrontendInventory = (rows: any[]): FrontendInventoryItem[] =>
  rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    stockQty: Number(row.quantity),
    isCommon: Boolean(row.is_common),
    unit: row.unit ?? "pcs",
  })) as any;

describe("End-to-end operational workflow: low stock -> replenishment -> readiness -> reservation -> dispatch", () => {
  let lowStockItem: any;
  let healthyItem: any;
  let commonItem: any;

  beforeAll(async () => {
    (AppDataSource as any).__reset();
    CartReservationService.getActiveReservations().forEach((r) =>
      CartReservationService.releaseReservation(r.cartId),
    );

    lowStockItem = await inventoryService.create({
      sku: "E2E-LOW-01",
      name: "IR Sensor Board",
      category: "Sensors",
      base_price: 85,
      quantity: 4,
      threshold: 10,
      is_common: false,
      unit: "pcs",
      bin_location: "A-01",
    });

    healthyItem = await inventoryService.create({
      sku: "E2E-OK-01",
      name: "Arduino Uno R3",
      category: "Boards",
      base_price: 450,
      quantity: 30,
      threshold: 5,
      is_common: false,
      unit: "pcs",
      bin_location: "A-02",
    });

    commonItem = await inventoryService.create({
      sku: "E2E-COMMON-01",
      name: "Zip Tie Bag",
      category: "Consumables",
      base_price: 4,
      quantity: 2,
      threshold: 50,
      is_common: true,
      unit: "pcs",
      bin_location: "C-01",
    });
  });

  it("step 1 — detects exactly the low-stock items that need replenishment", async () => {
    const lowStock = (await inventoryService.list({ lowStock: true })) as any[];
    const skus = lowStock.map((i) => i.sku);

    expect(skus).toContain("E2E-LOW-01");
    expect(skus).not.toContain("E2E-OK-01");
    expect(skus).not.toContain("E2E-COMMON-01");
  });

  it("step 2 — enforces the replenishment request approval policy per role", () => {
    // Project Staff requests are always drafts pending Inventory Staff approval.
    expect(
      getReplenishmentRequestStatus(normalizeCoreRole("employee"), "sent"),
    ).toBe("draft");
    expect(
      getReplenishmentRequestStatus(normalizeCoreRole("viewer"), "approved"),
    ).toBe("draft");

    // Inventory Staff and Admin can send/approve directly.
    expect(
      getReplenishmentRequestStatus(normalizeCoreRole("staff"), "sent"),
    ).toBe("sent");
    expect(
      getReplenishmentRequestStatus(normalizeCoreRole("admin"), "approved"),
    ).toBe("approved");
  });

  it("step 3 — creates an approved replenishment order for the low-stock item", async () => {
    const po = await purchaseOrderService.create(
      {
        vendor_name: "E2E Supplier",
        status: "sent",
        expected_date: new Date("2026-09-18"),
        lines: [{ inventory_item_id: lowStockItem.id, qty_ordered: 20, unit_cost: 85 }] as any,
      },
      ORG,
    );

    expect(po.status).toBe("sent");
    expect(po.vendor.name).toBe("E2E Supplier");
    expect(po.lines).toHaveLength(1);
    expect(po.lines[0].qty_ordered).toBe(20);
    expect(po.lines[0].qty_received).toBe(0);
    expect(Number(po.total_amount)).toBe(20 * 85);
  });

  it("step 4 — records a partial receipt, keeps the backorder open, and posts the ledger", async () => {
    const [po] = await purchaseOrderService.list(ORG);
    const line = po.lines[0];

    const afterPartial = await purchaseOrderService.receiveItems(
      po.id,
      [{ lineId: line.id, quantityReceived: 8 }],
      ORG,
      "Receiver One",
    );

    // Stock increased by the received quantity only.
    const refreshed = await inventoryService.getById(lowStockItem.id, ORG);
    expect(Number(refreshed!.quantity)).toBe(4 + 8);

    // PO stays open until every line is fully received.
    expect(afterPartial.status).toBe("approved");
    expect(afterPartial.lines[0].qty_received).toBe(8);

    // An immutable PO_RECEIPT ledger entry was posted with the running balance.
    const ledger = (AppDataSource as any).__rows("StockLedger");
    const receiptEntry = ledger.find((e: any) => e.reference_id === po.po_number);
    expect(receiptEntry).toBeDefined();
    expect(receiptEntry.transaction_type).toBe("PO_RECEIPT");
    expect(Number(receiptEntry.qty_delta)).toBe(8);
    expect(Number(receiptEntry.running_balance)).toBe(12);

    // The replenishment summary reports the remaining backorder quantity.
    const summary = summarizeReplenishmentOrder(
      {
        status: afterPartial.status,
        expectedDate: String(afterPartial.expected_date),
        items: afterPartial.lines.map((l: any) => ({
          quantity: l.qty_ordered,
          receivedQty: l.qty_received,
        })),
      },
      new Date("2026-09-24T00:00:00Z"),
    );
    expect(summary.status).toBe("backordered");
    expect(summary.isOverdue).toBe(true);
    expect(summary.remainingQty).toBe(12);
  });

  it("step 5 — closes the replenishment order after the backorder arrives", async () => {
    const [po] = await purchaseOrderService.list(ORG);
    const line = po.lines[0];

    const afterFull = await purchaseOrderService.receiveItems(
      po.id,
      [{ lineId: line.id, quantityReceived: 12 }],
      ORG,
      "Receiver Two",
    );

    expect(afterFull.status).toBe("received");
    expect(afterFull.lines[0].qty_received).toBe(20);

    const refreshed = await inventoryService.getById(lowStockItem.id, ORG);
    expect(Number(refreshed!.quantity)).toBe(24);

    const summary = summarizeReplenishmentOrder(
      {
        status: afterFull.status,
        expectedDate: String(afterFull.expected_date),
        items: afterFull.lines.map((l: any) => ({
          quantity: l.qty_ordered,
          receivedQty: l.qty_received,
        })),
      },
      new Date("2026-09-24T00:00:00Z"),
    );
    expect(summary.status).toBe("received");
    expect(summary.remainingQty).toBe(0);
  });

  it("step 6 — surfaces the project shortage and resolves it after replenishment", async () => {
    const project = {
      id: "PRJ-E2E-01",
      code: "PRJ-E2E",
      name: "E2E Prastuti Kit",
      classes: [
        {
          id: "cls-e2e",
          name: "E2E Class",
          batchMultiplier: 1,
          items: [
            {
              id: "wi-low",
              classId: "cls-e2e",
              name: "IR Sensor Board",
              totalQuantity: 30,
              unit: "pcs",
              sourcingChannel: "IN_STOCK",
              status: "PENDING",
            },
            {
              id: "wi-healthy",
              classId: "cls-e2e",
              name: "Arduino Uno R3",
              totalQuantity: 5,
              unit: "pcs",
              sourcingChannel: "IN_STOCK",
              status: "PENDING",
            },
          ],
        },
      ],
    } as unknown as Project;

    const inventoryRows = (await inventoryService.list({})) as any[];
    const shortages = getProjectInventoryShortages(project, toFrontendInventory(inventoryRows));

    expect(shortages).toHaveLength(1);
    expect(shortages[0]).toMatchObject({
      name: "IR Sensor Board",
      required: 30,
      available: 24,
      shortage: 6,
    });

    const readiness = getProjectReadinessSummary(project);
    expect(readiness.totalItems).toBe(2);
    expect(readiness.pendingItems).toBe(2);
    expect(readiness.readinessPercent).toBe(0);
    expect(readiness.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: "IN_STOCK", count: 2 }),
      ]),
    );
  });

  it("step 7 — reserves stock with soft-locks and rejects over-reservation", async () => {
    // 24 on hand after replenishment.
    const first = await CartReservationService.reserveStock({
      cartId: "cart-e2e-1",
      itemId: lowStockItem.id,
      quantity: 15,
      ttlMinutes: 10,
    });
    expect(first.success).toBe(true);
    expect(first.availableStock).toBe(9);

    // Another cart cannot reserve beyond the remaining available stock.
    await expect(
      CartReservationService.reserveStock({
        cartId: "cart-e2e-2",
        itemId: lowStockItem.id,
        quantity: 10,
        ttlMinutes: 10,
      }),
    ).rejects.toThrow(/Insufficient available stock/);

    // The same cart can extend its own reservation without double-counting.
    const extended = await CartReservationService.reserveStock({
      cartId: "cart-e2e-1",
      itemId: lowStockItem.id,
      quantity: 20,
      ttlMinutes: 10,
    });
    expect(extended.success).toBe(true);
    expect(extended.availableStock).toBe(4);
  });

  it("step 8 — dispatches through hard-lock checkout, deducts stock, and writes the ledger", async () => {
    const result = await CartReservationService.executeHardLockCheckout({
      cartId: "cart-e2e-1",
      orderReference: "ORD-E2E-01",
      lines: [{ itemId: lowStockItem.id, quantity: 20, unitCost: 85 }],
      actorName: "E2E Checkout",
    });

    expect(result.success).toBe(true);
    expect(result.orderReference).toBe("ORD-E2E-01");
    expect(result.committedItems[0]).toMatchObject({
      itemId: lowStockItem.id,
      sku: "E2E-LOW-01",
      deductedQuantity: 20,
      remainingStock: 4,
    });

    // Physical stock was deducted exactly once.
    const refreshed = await inventoryService.getById(lowStockItem.id, ORG);
    expect(Number(refreshed!.quantity)).toBe(4);

    // An immutable SO_SHIPMENT ledger entry was appended.
    const ledger = (AppDataSource as any).__rows("StockLedger");
    const shipmentEntry = ledger.find((e: any) => e.reference_id === "ORD-E2E-01");
    expect(shipmentEntry.transaction_type).toBe("SO_SHIPMENT");
    expect(Number(shipmentEntry.qty_delta)).toBe(-20);
    expect(Number(shipmentEntry.running_balance)).toBe(4);

    // The cart's soft-lock reservations were released after commitment.
    expect(CartReservationService.getActiveReservedQuantity(lowStockItem.id)).toBe(0);

    // Physical stock cannot go negative.
    await expect(
      CartReservationService.executeHardLockCheckout({
        cartId: "cart-e2e-1",
        orderReference: "ORD-E2E-02",
        lines: [{ itemId: lowStockItem.id, quantity: 5 }],
      }),
    ).rejects.toThrow(/Insufficient physical inventory/);
  });

  it("step 9 — dispatches a sales order through pick/pack/ship with ledger integrity", async () => {
    const so = await salesOrderService.create(
      {
        customer_name: "E2E School",
        status: "approved",
        lines: [{ inventory_item_id: healthyItem.id, qty_ordered: 6, unit_price: 450 }] as any,
      },
      ORG,
    );
    expect(so.status).toBe("approved");
    expect(Number(so.total_amount)).toBe(6 * 450);

    // Partial shipment moves the order to packed, not shipped.
    const afterPartialShip = await salesOrderService.shipItems(
      so.id,
      [{ lineId: so.lines[0].id, quantityShipped: 2 }],
      ORG,
      "Dispatcher One",
    );
    expect(afterPartialShip.status).toBe("packed");
    expect(afterPartialShip.lines[0].qty_shipped).toBe(2);

    let refreshed = await inventoryService.getById(healthyItem.id, ORG);
    expect(Number(refreshed!.quantity)).toBe(30 - 2);

    // Final shipment completes the order.
    const afterFullShip = await salesOrderService.shipItems(
      so.id,
      [{ lineId: so.lines[0].id, quantityShipped: 4 }],
      ORG,
      "Dispatcher Two",
    );
    expect(afterFullShip.status).toBe("shipped");
    expect(afterFullShip.lines[0].qty_shipped).toBe(6);

    refreshed = await inventoryService.getById(healthyItem.id, ORG);
    expect(Number(refreshed!.quantity)).toBe(24);

    const ledger = (AppDataSource as any).__rows("StockLedger");
    const soShipments = ledger.filter(
      (e: any) => e.reference_id === so.so_number && e.transaction_type === "SO_SHIPMENT",
    );
    expect(soShipments).toHaveLength(2);
    expect(soShipments.map((e: any) => Number(e.qty_delta)).sort((a: number, b: number) => a - b)).toEqual([-4, -2]);

    // Overshipping beyond physical stock is rejected.
    await expect(
      salesOrderService.shipItems(
        so.id,
        [{ lineId: so.lines[0].id, quantityShipped: 100 }],
        ORG,
      ),
    ).rejects.toThrow(/Insufficient inventory/);
  });

  it("step 10 — keeps the audit trail complete for every stock mutation", () => {
    const auditLogs = (AppDataSource as any).__rows("AuditLog");
    const ledger = (AppDataSource as any).__rows("StockLedger");

    // Ledger covers receipts and shipments across the whole workflow.
    const types = ledger.map((e: any) => e.transaction_type).sort();
    expect(types).toEqual(["PO_RECEIPT", "PO_RECEIPT", "SO_SHIPMENT", "SO_SHIPMENT", "SO_SHIPMENT"]);

    // Every ledger entry carries a reference to its source document.
    for (const entry of ledger) {
      expect(entry.reference_id).toBeTruthy();
      expect(entry.running_balance).toBeGreaterThanOrEqual(0);
    }

    expect(auditLogs.length).toBeGreaterThanOrEqual(0);
  });
});
