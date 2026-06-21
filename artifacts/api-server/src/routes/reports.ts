import { Router } from "express";
import { db, yarnDyeingOrderTable, yarnDyeingOrderColorRowTable, factoriesTable } from "@workspace/db";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";

const router = Router();

router.get("/reports/daily", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

    const [summary] = await db
      .select({
        ordersReceived: sql<number>`count(distinct ${yarnDyeingOrderTable.id})::int`,
        totalKg: sql<number>`coalesce(sum(${yarnDyeingOrderColorRowTable.qtyKg}::numeric), 0)::float`,
        deliveredOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.status} = 'Delivered')::int`,
      })
      .from(yarnDyeingOrderTable)
      .leftJoin(yarnDyeingOrderColorRowTable, eq(yarnDyeingOrderColorRowTable.orderId, yarnDyeingOrderTable.id))
      .where(eq(yarnDyeingOrderTable.receiveDate, date));

    const orders = await db
      .select({
        id: yarnDyeingOrderTable.id,
        orderNo: yarnDyeingOrderTable.orderNo,
        customerGarmentsName: yarnDyeingOrderTable.customerGarmentsName,
        jobNo: yarnDyeingOrderTable.jobNo,
        unit: yarnDyeingOrderTable.unit,
        factoryId: yarnDyeingOrderTable.factoryId,
        factoryName: factoriesTable.name,
        orderType: yarnDyeingOrderTable.orderType,
        receiveDate: yarnDyeingOrderTable.receiveDate,
        deliveryDate: yarnDyeingOrderTable.deliveryDate,
        status: yarnDyeingOrderTable.status,
        createdAt: yarnDyeingOrderTable.createdAt,
      })
      .from(yarnDyeingOrderTable)
      .leftJoin(factoriesTable, eq(yarnDyeingOrderTable.factoryId, factoriesTable.id))
      .where(eq(yarnDyeingOrderTable.receiveDate, date))
      .orderBy(desc(yarnDyeingOrderTable.createdAt));

    res.json({
      date,
      ordersReceived: summary?.ordersReceived ?? 0,
      totalKg: summary?.totalKg ?? 0,
      deliveredOrders: summary?.deliveredOrders ?? 0,
      orders,
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
        totalOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id})::int`,
        sampleOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.orderType} = 'Sample')::int`,
        bulkOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.orderType} = 'Bulk')::int`,
        totalKg: sql<number>`coalesce(sum(${yarnDyeingOrderColorRowTable.qtyKg}::numeric), 0)::float`,
        deliveredOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.status} = 'Delivered')::int`,
      })
      .from(yarnDyeingOrderTable)
      .leftJoin(yarnDyeingOrderColorRowTable, eq(yarnDyeingOrderColorRowTable.orderId, yarnDyeingOrderTable.id))
      .where(and(gte(yarnDyeingOrderTable.receiveDate, fromDate), lte(yarnDyeingOrderTable.receiveDate, toDate)));

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
        totalOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id})::int`,
        completedOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.status} = 'Delivered')::int`,
        pendingOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.status} != 'Delivered')::int`,
        totalKg: sql<number>`coalesce(sum(${yarnDyeingOrderColorRowTable.qtyKg}::numeric), 0)::float`,
      })
      .from(factoriesTable)
      .leftJoin(yarnDyeingOrderTable, eq(yarnDyeingOrderTable.factoryId, factoriesTable.id))
      .leftJoin(yarnDyeingOrderColorRowTable, eq(yarnDyeingOrderColorRowTable.orderId, yarnDyeingOrderTable.id))
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
        buyerName: yarnDyeingOrderTable.customerGarmentsName,
        totalOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id})::int`,
        totalKg: sql<number>`coalesce(sum(${yarnDyeingOrderColorRowTable.qtyKg}::numeric), 0)::float`,
        sampleOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.orderType} = 'Sample')::int`,
        bulkOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.orderType} = 'Bulk')::int`,
      })
      .from(yarnDyeingOrderTable)
      .leftJoin(yarnDyeingOrderColorRowTable, eq(yarnDyeingOrderColorRowTable.orderId, yarnDyeingOrderTable.id))
      .groupBy(yarnDyeingOrderTable.customerGarmentsName)
      .orderBy(desc(sql`count(distinct ${yarnDyeingOrderTable.id})`));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get buyer report");
    res.status(500).json({ error: "Failed to get buyer report" });
  }
});

export default router;
