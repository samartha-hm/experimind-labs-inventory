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

  async inventoryValuation(): Promise<any> {
    const inventory = await this.inventoryRepo.find();

    // Group by category
    const byCategory = inventory.reduce((acc, item) => {
      const cat = item.category ?? "Uncategorized";
      if (!acc[cat]) {
        acc[cat] = { count: 0, totalValue: 0, totalQuantity: 0 };
      }
      acc[cat].count += 1;
      const itemValue = item.base_price * item.quantity;
      acc[cat].totalValue += itemValue;
      acc[cat].totalQuantity += item.quantity;
      return acc;
    }, {} as Record<string, { count: number; totalValue: number; totalQuantity: number }>);

    // Calculate totals
    const totalValue = inventory.reduce((sum, item) => sum + (item.base_price * item.quantity), 0);
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
        totalValue,
        totalQuantity,
        avgCostPerItem: inventory.length > 0 ? totalValue / inventory.length : 0,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length
      },
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        ...data,
        avgValuePerItem: data.count > 0 ? data.totalValue / data.count : 0
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
  }): Promise<any> {
    const qb = this.txRepo.createQueryBuilder("transaction")
      .innerJoinAndSelect("transaction.lines", "lines")
      .innerJoinAndSelect("lines.inventory_item", "item")
      .where("transaction.reference_type = :refType", { refType: "sales_order" });

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
        const itemId = line.inventory_item.id;
        if (!acc[itemId]) {
          acc[itemId] = { quantitySold: 0, totalSalesValue: 0 };
        }
        // quantity_change is negative for sales (outgoing), so we take absolute value
        const quantitySold = Math.abs(line.quantity_change);
        acc[itemId].quantitySold += quantitySold;
        acc[itemId].totalSalesValue += quantitySold * line.unit_cost;
      });
      return acc;
    }, {} as Record<string, { quantitySold: number; totalSalesValue: number }>);

    // Get inventory items to calculate average inventory
    const inventoryItems = await this.inventoryRepo.find();

    // For simplicity, using current quantity as average inventory
    // In a real system, you'd calculate average over the period
    const turnoverData = inventoryItems.map(item => {
      const sales = itemSales[item.id] || { quantitySold: 0, totalSalesValue: 0 };
      const averageInventory = item.quantity; // Simplified - using current stock

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category ?? "Uncategorized",
        quantitySold: sales.quantitySold,
        totalSalesValue: sales.totalSalesValue,
        averageInventory: averageInventory,
        turnoverRatio: averageInventory > 0 ? sales.quantitySold / averageInventory : 0,
        daysInInventory: averageInventory > 0 ? (365 / (sales.quantitySold / averageInventory)) : 0,
        avgDailySales: sales.quantitySold > 0 ? sales.quantitySold / 365 : 0 // Assuming annual data
      };
    }).filter(item => item.quantitySold > 0); // Only items with sales

    // Sort by turnover ratio descending
    turnoverData.sort((a, b) => b.turnoverRatio - a.turnoverRatio);

    return {
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate
      },
      turnoverData,
      summary: {
        totalItemsSold: turnoverData.reduce((sum, item) => sum + item.quantitySold, 0),
        totalSalesValue: turnoverData.reduce((sum, item) => sum + item.totalSalesValue, 0),
        averageTurnoverRatio: turnoverData.length > 0 ?
          turnoverData.reduce((sum, item) => sum + item.turnoverRatio, 0) / turnoverData.length : 0,
        medianDaysInInventory: turnoverData.length > 0 ?
          [...turnoverData.map(d => d.daysInInventory)].sort((a, b) => a - b)[Math.floor(turnoverData.length / 2)] : 0
      }
    };
  }

  async lowStockAlerts(warehouseId?: string): Promise<any> {
    const qb = this.inventoryRepo.createQueryBuilder("item")
      .where("item.quantity < item.threshold")
      .andWhere("item.is_common = false")
      .andWhere("item.is_sellable = true")
      .leftJoinAndSelect("item.warehouse", "warehouse")
      .leftJoinAndSelect("item.bin", "bin");

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
      shortagePercent: ((item.threshold - item.quantity) / item.threshold) * 100,
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

  async purchaseOrderStatus(): Promise<any> {
    const pos = await this.poRepo.find({ relations: ["vendor"] });

    const statusCounts = pos.reduce((acc, po) => {
      const status = po.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate value by status
    const valueByStatus = pos.reduce((acc, po) => {
      const status = po.status || "unknown";
      const value = po.total_amount || 0;
      acc[status] = (acc[status] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average days to receive (for completed POs)
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
      .reduce((sum, po) => sum + (po.total_amount || 0), 0);

    const completionRate = pos.length > 0
      ? (pos.filter(po => po.status === "received").length / pos.length) * 100
      : 0;

    const fulfilledValue = pos
      .filter(po => po.status === "received")
      .reduce((sum, po) => sum + (po.total_amount || 0), 0);

    return {
      summary: {
        totalPos: pos.length,
        totalValue: pos.reduce((sum, po) => sum + (po.total_amount || 0), 0),
        statusCounts,
        valueByStatus,
        pendingValue,
        completionRate: parseFloat(completionRate.toFixed(1)),
        avgDaysToReceive: parseFloat(avgDaysToReceive.toFixed(1)),
        onTimeDeliveryRate: completedPos.length > 0 ?
          (completedPos.filter(po => {
            const expected = new Date(po.expected_date!);
            const actual = new Date(po.updated_at);
            return actual <= expected; // Received on or before expected date
          }).length / completedPos.length) * 100 : 0
      },
      pos: pos.map(po => ({
        id: po.id,
        poNumber: po.po_number,
        vendorName: po.vendor?.name || "Unknown Vendor",
        status: po.status || "unknown",
        orderDate: po.order_date,
        expectedDate: po.expected_date,
        totalAmount: po.total_amount,
        daysUntilExpected: po.expected_date ?
          Math.ceil((new Date(po.expected_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
      }))
    };
  }

  async salesOrderStatus(): Promise<any> {
    const sos = await this.soRepo.find({ relations: ["customer"] });

    const statusCounts = sos.reduce((acc, so) => {
      const status = so.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate value by status
    const valueByStatus = sos.reduce((acc, so) => {
      const status = so.status || "unknown";
      const value = so.total_amount || 0;
      acc[status] = (acc[status] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average fulfillment time (for completed SOs)
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
      .reduce((sum, so) => sum + (so.total_amount || 0), 0);

    const fulfillmentRate = sos.length > 0
      ? (sos.filter(so => so.status === "delivered").length / sos.length) * 100
      : 0;

    return {
      summary: {
        totalSos: sos.length,
        totalValue: sos.reduce((sum, so) => sum + (so.total_amount || 0), 0),
        statusCounts,
        valueByStatus: valueByStatus,
        fulfilledValue,
        fulfillmentRate: parseFloat(fulfillmentRate.toFixed(1)),
        avgFulfillmentTime: parseFloat(avgFulfillmentTime.toFixed(1)),
        onTimeDeliveryRate: completedSos.length > 0 ?
          (completedSos.filter(so => {
            const required = new Date(so.required_date!);
            const actual = new Date(so.updated_at);
            return actual <= required; // Delivered on or before required date
          }).length / completedSos.length) * 100 : 0
      },
      sos: sos.map(so => ({
        id: so.id,
        soNumber: so.so_number,
        customerName: so.customer?.name || "Unknown Customer",
        status: so.status || "unknown",
        orderDate: so.order_date,
        requiredDate: so.required_date,
        totalAmount: so.total_amount,
        daysUntilRequired: so.required_date ?
          Math.ceil((new Date(so.required_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
      }))
    };
  }
}