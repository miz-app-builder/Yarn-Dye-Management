import { Router } from "express";
import { db, ordersTable, factoriesTable, orderStatusHistoryTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [summary] = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        totalKg: sql<number>`coalesce(sum(${ordersTable.quantityKg}::numeric), 0)::float`,
        deliveredOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'Delivered')::int`,
        pendingOrders: sql<number>`count(*) filter (where ${ordersTable.status} != 'Delivered')::int`,
        runningOrders: sql<number>`count(*) filter (where ${ordersTable.status} in ('Lab Dip', 'Dyeing Running', 'Finishing'))::int`,
        todayReceived: sql<number>`count(*) filter (where ${ordersTable.receiveDate} = ${today})::int`,
        sampleOrders: sql<number>`count(*) filter (where ${ordersTable.orderType} = 'Sample')::int`,
        bulkOrders: sql<number>`count(*) filter (where ${ordersTable.orderType} = 'Bulk')::int`,
      })
      .from(ordersTable);

    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

router.get("/dashboard/factory-performance", async (req, res) => {
  try {
    const rows = await db
      .select({
        factoryId: factoriesTable.id,
        factoryName: factoriesTable.name,
        totalOrders: sql<number>`count(${ordersTable.id})::int`,
        completedOrders: sql<number>`count(${ordersTable.id}) filter (where ${ordersTable.status} = 'Delivered')::int`,
        pendingOrders: sql<number>`count(${ordersTable.id}) filter (where ${ordersTable.status} != 'Delivered')::int`,
        totalKg: sql<number>`coalesce(sum(${ordersTable.quantityKg}::numeric), 0)::float`,
      })
      .from(factoriesTable)
      .leftJoin(ordersTable, eq(ordersTable.factoryId, factoriesTable.id))
      .where(eq(factoriesTable.status, true))
      .groupBy(factoriesTable.id, factoriesTable.name)
      .orderBy(desc(sql`count(${ordersTable.id})`));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get factory performance");
    res.status(500).json({ error: "Failed to get factory performance" });
  }
});

router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const rows = await db
      .select({
        id: orderStatusHistoryTable.id,
        orderNo: ordersTable.orderNo,
        buyerName: ordersTable.buyerName,
        factoryName: factoriesTable.name,
        status: orderStatusHistoryTable.status,
        createdAt: orderStatusHistoryTable.createdAt,
      })
      .from(orderStatusHistoryTable)
      .innerJoin(ordersTable, eq(orderStatusHistoryTable.orderId, ordersTable.id))
      .leftJoin(factoriesTable, eq(ordersTable.factoryId, factoriesTable.id))
      .orderBy(desc(orderStatusHistoryTable.createdAt))
      .limit(limit);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get recent activity");
    res.status(500).json({ error: "Failed to get recent activity" });
  }
});

export default router;
