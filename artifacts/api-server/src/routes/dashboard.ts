import { Router } from "express";
import { db, yarnDyeingOrderTable, yarnDyeingOrderColorRowTable, factoriesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [summary] = await db
      .select({
        totalOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id})::int`,
        totalKg: sql<number>`coalesce(sum(${yarnDyeingOrderColorRowTable.qtyKg}::numeric), 0)::float`,
        deliveredOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.status} = 'Delivered')::int`,
        pendingOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.status} != 'Delivered')::int`,
        runningOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.status} in ('Lab Dip', 'Dyeing Running', 'Finishing'))::int`,
        todayReceived: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.receiveDate} = ${today})::int`,
        sampleOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.orderType} = 'Sample')::int`,
        bulkOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.orderType} = 'Bulk')::int`,
      })
      .from(yarnDyeingOrderTable)
      .leftJoin(yarnDyeingOrderColorRowTable, eq(yarnDyeingOrderColorRowTable.orderId, yarnDyeingOrderTable.id));

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
        totalOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id})::int`,
        completedOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.status} = 'Delivered')::int`,
        pendingOrders: sql<number>`count(distinct ${yarnDyeingOrderTable.id}) filter (where ${yarnDyeingOrderTable.status} != 'Delivered')::int`,
        totalKg: sql<number>`coalesce(sum(${yarnDyeingOrderColorRowTable.qtyKg}::numeric), 0)::float`,
      })
      .from(factoriesTable)
      .leftJoin(yarnDyeingOrderTable, eq(yarnDyeingOrderTable.factoryId, factoriesTable.id))
      .leftJoin(yarnDyeingOrderColorRowTable, eq(yarnDyeingOrderColorRowTable.orderId, yarnDyeingOrderTable.id))
      .where(eq(factoriesTable.status, true))
      .groupBy(factoriesTable.id, factoriesTable.name)
      .orderBy(desc(sql`count(distinct ${yarnDyeingOrderTable.id})`));

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
        id: yarnDyeingOrderTable.id,
        orderNo: yarnDyeingOrderTable.orderNo,
        buyerName: yarnDyeingOrderTable.customerGarmentsName,
        factoryName: factoriesTable.name,
        status: yarnDyeingOrderTable.status,
        createdAt: yarnDyeingOrderTable.createdAt,
      })
      .from(yarnDyeingOrderTable)
      .leftJoin(factoriesTable, eq(yarnDyeingOrderTable.factoryId, factoriesTable.id))
      .orderBy(desc(yarnDyeingOrderTable.createdAt))
      .limit(limit);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get recent activity");
    res.status(500).json({ error: "Failed to get recent activity" });
  }
});

export default router;
