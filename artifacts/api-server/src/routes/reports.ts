import { Router } from "express";
import { db, ordersTable, factoriesTable } from "@workspace/db";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";

const router = Router();

router.get("/reports/daily", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

    const [summary] = await db
      .select({
        ordersReceived: sql<number>`count(*)::int`,
        totalKg: sql<number>`coalesce(sum(${ordersTable.quantityKg}::numeric), 0)::float`,
        deliveredOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'Delivered')::int`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.receiveDate, date));

    const orders = await db
      .select({
        id: ordersTable.id,
        orderNo: ordersTable.orderNo,
        buyerName: ordersTable.buyerName,
        factoryId: ordersTable.factoryId,
        factoryName: factoriesTable.name,
        orderType: ordersTable.orderType,
        yarnType: ordersTable.yarnType,
        color: ordersTable.color,
        quantityKg: ordersTable.quantityKg,
        receiveDate: ordersTable.receiveDate,
        deliveryDate: ordersTable.deliveryDate,
        status: ordersTable.status,
        remarks: ordersTable.remarks,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .leftJoin(factoriesTable, eq(ordersTable.factoryId, factoriesTable.id))
      .where(eq(ordersTable.receiveDate, date))
      .orderBy(desc(ordersTable.createdAt));

    res.json({
      date,
      ordersReceived: summary?.ordersReceived ?? 0,
      totalKg: summary?.totalKg ?? 0,
      deliveredOrders: summary?.deliveredOrders ?? 0,
      orders: orders.map(o => ({ ...o, quantityKg: Number(o.quantityKg) })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get daily report");
    res.status(500).json({ error: "Failed to get daily report" });
  }
});

router.get("/reports/monthly", async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const toDate = new Date(year, month, 0).toISOString().split("T")[0];

    const [summary] = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        sampleOrders: sql<number>`count(*) filter (where ${ordersTable.orderType} = 'Sample')::int`,
        bulkOrders: sql<number>`count(*) filter (where ${ordersTable.orderType} = 'Bulk')::int`,
        totalKg: sql<number>`coalesce(sum(${ordersTable.quantityKg}::numeric), 0)::float`,
        deliveredOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'Delivered')::int`,
      })
      .from(ordersTable)
      .where(and(gte(ordersTable.receiveDate, fromDate), lte(ordersTable.receiveDate, toDate)));

    res.json({
      year,
      month,
      totalOrders: summary?.totalOrders ?? 0,
      sampleOrders: summary?.sampleOrders ?? 0,
      bulkOrders: summary?.bulkOrders ?? 0,
      totalKg: summary?.totalKg ?? 0,
      deliveredOrders: summary?.deliveredOrders ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get monthly report");
    res.status(500).json({ error: "Failed to get monthly report" });
  }
});

router.get("/reports/factory", async (req, res) => {
  try {
    const factoryId = req.query.factoryId ? Number(req.query.factoryId) : null;

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
      .where(factoryId ? eq(factoriesTable.id, factoryId) : eq(factoriesTable.status, true))
      .groupBy(factoriesTable.id, factoriesTable.name)
      .orderBy(factoriesTable.name);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get factory report");
    res.status(500).json({ error: "Failed to get factory report" });
  }
});

router.get("/reports/buyer", async (req, res) => {
  try {
    const rows = await db
      .select({
        buyerName: ordersTable.buyerName,
        totalOrders: sql<number>`count(*)::int`,
        totalKg: sql<number>`coalesce(sum(${ordersTable.quantityKg}::numeric), 0)::float`,
        sampleOrders: sql<number>`count(*) filter (where ${ordersTable.orderType} = 'Sample')::int`,
        bulkOrders: sql<number>`count(*) filter (where ${ordersTable.orderType} = 'Bulk')::int`,
      })
      .from(ordersTable)
      .groupBy(ordersTable.buyerName)
      .orderBy(desc(sql`count(*)`));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get buyer report");
    res.status(500).json({ error: "Failed to get buyer report" });
  }
});

export default router;
