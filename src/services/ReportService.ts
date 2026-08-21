import { InventoryItem } from "../entity/InventoryItem";
import { Warehouse } from "../entity/Warehouse";
import { Bin } from "../entity/Bin";
import { Kit } from "../entity/Kit";
import { KitBom } from "../entity/KitBom";
import { PurchaseOrder } from "../entity/PurchaseOrder";
import { SalesOrder } from "../entity/SalesOrder";
import { Transaction } from "../entity/Transaction";
import { AppDataSource } from "../db";
import { Repository } from "typeorm";

export class ReportService {
  private get inventoryRepo(): Repository<InventoryItem> {
    return AppDataSource.getRepository(InventoryItem);
  }
  private get warehouseRepo(): Repository<Warehouse> {
    return AppDataSource.getRepository(Warehouse);
  }
  private get binRepo(): Repository<Bin> {
    return AppDataSource.getRepository(Bin);
  }
  private get kitRepo(): Repository<Kit> {
    return AppDataSource.getRepository(Kit);
  }
  private get bomRepo(): Repository<KitBom> {
    return AppDataSource.getRepository(KitBom);
  }
  private get poRepo(): Repository<PurchaseOrder> {
    return AppDataSource.getRepository(PurchaseOrder);
  }
  private get soRepo(): Repository<SalesOrder> {
    return AppDataSource.getRepository(SalesOrder);
  }
  private get txRepo(): Repository<Transaction> {
    return AppDataSource.getRepository(Transaction);
  }

  async inventoryValuation(organizationId?: string): Promise<any> {
    const where: any = {};
    if (organizationId) {
      where.organization_id = organizationId;
    }
    const inventory = await this.inventoryRepo.find({ where });

    // Group by category
    const byCategory = inventory.reduce((acc, item) => {
      const cat = item.category ?? "Uncategorized";
      if (!acc[cat]) {
        acc[cat] = { count: 0, totalValue: 0, totalQuantity: 0 };
      }
      acc[cat].count += 1;
      const itemValue = Number(item.base_price) * item.quantity;
      acc[cat].totalValue += itemValue;
      acc[cat].totalQuantity += item.quantity;
      return acc;
    }, {} as Record<string, { count: number; totalValue: number; totalQuantity: number }>);

    // Calculate totals
    const totalValue = inventory.reduce((sum, item) => sum + (Number(item.base_price) * item.quantity), 0);
    const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockItems = inventory.filter(item =>
      item.quantity < item.threshold && !item.is_common
    );
    const outOfStockItems = inventory.filter(item =>
      item.quantity === 0 && !item.is_common
    );

    return {
      summary: {
        totalItems: inventory.length,
        totalValue: Number(totalValue.toFixed(2)),
        totalQuantity,
        avgCostPerItem: inventory.length > 0 ? Number((totalValue / inventory.length).toFixed(2)) : 0,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length
      },
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        ...data,
        totalValue: Number(data.totalValue.toFixed(2)),
        avgValuePerItem: data.count > 0 ? Number((data.totalValue / data.count).toFixed(2)) : 0
      })),
      lowStockItems: lowStockItems.map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        threshold: item.threshold,
        shortage: item.threshold - item.quantity,
        category: item.category ?? "Uncategorized"
      })),
      outOfStockItems: outOfStockItems.map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category ?? "Uncategorized"
      }))
    };
  }

  async inventoryTurnover(filters: {
    startDate?: string;
    endDate?: string;
  }, organizationId?: string): Promise<any> {
    const qb = this.txRepo.createQueryBuilder("transaction")
      .innerJoinAndSelect("transaction.lines", "lines")
      .innerJoinAndSelect("lines.inventory_item", "item")
      .where("transaction.reference_type = :refType", { refType: "sales_order" });

    if (organizationId) {
      qb.andWhere("transaction.organization_id = :organizationId", { organizationId });
    }
    if (filters.startDate) {
      qb.andWhere("transaction.occurred_at >= :startDate", { startDate: new Date(filters.startDate) });
    }
    if (filters.endDate) {
      qb.andWhere("transaction.occurred_at <= :endDate", { endDate: new Date(filters.endDate) });
    }

    const transactions = await qb.getMany();

    // Calculate quantity sold per item (positive values for sales)
    const itemSales = transactions.reduce((acc, tx) => {
      tx.lines.forEach(line => {
        const itemId = line.inventory_item?.id;
        if (!itemId) return;
        if (!acc[itemId]) {
          acc[itemId] = { quantitySold: 0, totalSalesValue: 0 };
        }
        const quantitySold = Math.abs(line.quantity_change);
        acc[itemId].quantitySold += quantitySold;
        acc[itemId].totalSalesValue += quantitySold * Number(line.unit_cost || 0);
      });
      return acc;
    }, {} as Record<string, { quantitySold: number; totalSalesValue: number }>);

    // Get inventory items scoped by organization
    const itemWhere: any = {};
    if (organizationId) itemWhere.organization_id = organizationId;
    const inventoryItems = await this.inventoryRepo.find({ where: itemWhere });

    const turnoverData = inventoryItems.map(item => {
      const sales = itemSales[item.id] || { quantitySold: 0, totalSalesValue: 0 };
      const averageInventory = item.quantity;

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category ?? "Uncategorized",
        quantitySold: sales.quantitySold,
        totalSalesValue: Number(sales.totalSalesValue.toFixed(2)),
        averageInventory: averageInventory,
        turnoverRatio: averageInventory > 0 ? Number((sales.quantitySold / averageInventory).toFixed(2)) : 0,
        daysInInventory: averageInventory > 0 ? Math.round(365 / (sales.quantitySold / averageInventory)) : 0,
        avgDailySales: sales.quantitySold > 0 ? Number((sales.quantitySold / 365).toFixed(2)) : 0
      };
    }).filter(item => item.quantitySold > 0);

    turnoverData.sort((a, b) => b.turnoverRatio - a.turnoverRatio);

    return {
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate
      },
      turnoverData,
      summary: {
        totalItemsSold: turnoverData.reduce((sum, item) => sum + item.quantitySold, 0),
        totalSalesValue: Number(turnoverData.reduce((sum, item) => sum + item.totalSalesValue, 0).toFixed(2)),
        averageTurnoverRatio: turnoverData.length > 0 ?
          Number((turnoverData.reduce((sum, item) => sum + item.turnoverRatio, 0) / turnoverData.length).toFixed(2)) : 0,
        medianDaysInInventory: turnoverData.length > 0 ?
          [...turnoverData.map(d => d.daysInInventory)].sort((a, b) => a - b)[Math.floor(turnoverData.length / 2)] : 0
      }
    };
  }

  async lowStockAlerts(warehouseId?: string, organizationId?: string): Promise<any> {
    const qb = this.inventoryRepo.createQueryBuilder("item")
      .where("item.quantity < item.threshold")
      .andWhere("item.is_common = false")
      .andWhere("item.is_sellable = true")
      .leftJoinAndSelect("item.warehouse", "warehouse")
      .leftJoinAndSelect("item.bin", "bin");

    if (organizationId) {
      qb.andWhere("item.organization_id = :organizationId", { organizationId });
    }
    if (warehouseId) {
      qb.andWhere("warehouse.id = :warehouseId", { warehouseId });
    }

    const lowStockItems = await qb.getMany();

    return lowStockItems.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category ?? "Uncategorized",
      currentQuantity: item.quantity,
      threshold: item.threshold,
      shortage: item.threshold - item.quantity,
      shortagePercent: Number((((item.threshold - item.quantity) / Math.max(1, item.threshold)) * 100).toFixed(1)),
      warehouse: item.warehouse ? {
        id: item.warehouse.id,
        name: item.warehouse.name,
        code: item.warehouse.code
      } : null,
      bin: item.bin ? {
        id: item.bin.id,
        code: item.bin.code,
        description: item.bin.description
      } : null
    }));
  }

  async purchaseOrderStatus(organizationId?: string): Promise<any> {
    const where: any = {};
    if (organizationId) {
      where.organization_id = organizationId;
    }
    const pos = await this.poRepo.find({ where, relations: ["vendor"] });

    const statusCounts = pos.reduce((acc, po) => {
      const status = po.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const valueByStatus = pos.reduce((acc, po) => {
      const status = po.status || "unknown";
      const value = Number(po.total_amount) || 0;
      acc[status] = (acc[status] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    const completedPos = pos.filter(po => po.status === "received" && po.expected_date && po.updated_at);
    const avgDaysToReceive = completedPos.length > 0 ?
      completedPos.reduce((sum, po) => {
        const expected = new Date(po.expected_date!);
        const actual = new Date(po.updated_at);
        const diffTime = Math.abs(actual.getTime() - expected.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0) / completedPos.length : 0;

    const pendingValue = pos
      .filter(po => po.status !== "received" && po.status !== "cancelled")
      .reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0);

    const completionRate = pos.length > 0
      ? (pos.filter(po => po.status === "received").length / pos.length) * 100
      : 0;

    const fulfilledValue = pos
      .filter(po => po.status === "received")
      .reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0);

    return {
      summary: {
        totalPos: pos.length,
        totalValue: Number(pos.reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0).toFixed(2)),
        statusCounts,
        valueByStatus,
        pendingValue: Number(pendingValue.toFixed(2)),
        fulfilledValue: Number(fulfilledValue.toFixed(2)),
        completionRate: parseFloat(completionRate.toFixed(1)),
        avgDaysToReceive: parseFloat(avgDaysToReceive.toFixed(1)),
        onTimeDeliveryRate: completedPos.length > 0 ?
          (completedPos.filter(po => {
            const expected = new Date(po.expected_date!);
            const actual = new Date(po.updated_at);
            return actual <= expected;
          }).length / completedPos.length) * 100 : 0
      },
      pos: pos.map(po => ({
        id: po.id,
        poNumber: po.po_number,
        vendorName: po.vendor?.name || "Unknown Vendor",
        status: po.status || "unknown",
        orderDate: po.order_date,
        expectedDate: po.expected_date,
        totalAmount: Number(po.total_amount),
        daysUntilExpected: po.expected_date ?
          Math.ceil((new Date(po.expected_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
      }))
    };
  }

  async salesOrderStatus(organizationId?: string): Promise<any> {
    const where: any = {};
    if (organizationId) {
      where.organization_id = organizationId;
    }
    const sos = await this.soRepo.find({ where, relations: ["customer"] });

    const statusCounts = sos.reduce((acc, so) => {
      const status = so.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const valueByStatus = sos.reduce((acc, so) => {
      const status = so.status || "unknown";
      const value = Number(so.total_amount) || 0;
      acc[status] = (acc[status] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    const completedSos = sos.filter(so => so.status === "delivered" && so.required_date && so.updated_at);
    const avgFulfillmentTime = completedSos.length > 0 ?
      completedSos.reduce((sum, so) => {
        const required = new Date(so.required_date!);
        const actual = new Date(so.updated_at);
        const diffTime = Math.abs(actual.getTime() - required.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0) / completedSos.length : 0;

    const fulfilledValue = sos
      .filter(so => so.status === "delivered")
      .reduce((sum, so) => sum + (Number(so.total_amount) || 0), 0);

    const fulfillmentRate = sos.length > 0
      ? (sos.filter(so => so.status === "delivered").length / sos.length) * 100
      : 0;

    return {
      summary: {
        totalSos: sos.length,
        totalValue: Number(sos.reduce((sum, so) => sum + (Number(so.total_amount) || 0), 0).toFixed(2)),
        statusCounts,
        valueByStatus,
        fulfilledValue: Number(fulfilledValue.toFixed(2)),
        fulfillmentRate: parseFloat(fulfillmentRate.toFixed(1)),
        avgFulfillmentTime: parseFloat(avgFulfillmentTime.toFixed(1)),
        onTimeDeliveryRate: completedSos.length > 0 ?
          (completedSos.filter(so => {
            const required = new Date(so.required_date!);
            const actual = new Date(so.updated_at);
            return actual <= required;
          }).length / completedSos.length) * 100 : 0
      },
      sos: sos.map(so => ({
        id: so.id,
        soNumber: so.so_number,
        customerName: so.customer?.name || "Unknown Customer",
        status: so.status || "unknown",
        orderDate: so.order_date,
        requiredDate: so.required_date,
        totalAmount: Number(so.total_amount),
        daysUntilRequired: so.required_date ?
          Math.ceil((new Date(so.required_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
      }))
    };
  }
}