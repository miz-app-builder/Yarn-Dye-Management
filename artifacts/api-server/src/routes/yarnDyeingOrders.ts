import { Router } from "express";
import { db, yarnDyeingOrderTable, yarnDyeingOrderColorRowTable, factoriesTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, sql, desc } from "drizzle-orm";
import {
  CreateYarnDyeingOrderBody,
  UpdateYarnDyeingOrderBody,
  GetYarnDyeingOrderParams,
  UpdateYarnDyeingOrderParams,
  DeleteYarnDyeingOrderParams,
  ListYarnDyeingOrdersQueryParams,
} from "@workspace/api-zod";

const router = Router();

function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `YDO-${y}${m}${d}-${rand}`;
}

router.get("/yarn-dyeing-orders", async (req, res): Promise<void> => {
  try {
    const q = ListYarnDyeingOrdersQueryParams.safeParse(req.query);
    const params = (q.success ? q.data : {}) as NonNullable<typeof q.data>;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (params.factoryId) conditions.push(eq(yarnDyeingOrderTable.factoryId, params.factoryId));
    if (params.orderType) conditions.push(eq(yarnDyeingOrderTable.orderType, params.orderType));
    if (params.status) conditions.push(eq(yarnDyeingOrderTable.status, params.status));
    if (params.dateFrom) conditions.push(gte(yarnDyeingOrderTable.receiveDate, String(params.dateFrom)));
    if (params.dateTo) conditions.push(lte(yarnDyeingOrderTable.receiveDate, String(params.dateTo)));
    if (params.search) {
      conditions.push(
        sql`(${ilike(yarnDyeingOrderTable.orderNo, `%${params.search}%`)} OR ${ilike(yarnDyeingOrderTable.customerGarmentsName, `%${params.search}%`)} OR ${ilike(yarnDyeingOrderTable.jobNo, `%${params.search}%`)})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: yarnDyeingOrderTable.id,
          orderNo: yarnDyeingOrderTable.orderNo,
          orderType: yarnDyeingOrderTable.orderType,
          receiveDate: yarnDyeingOrderTable.receiveDate,
          deliveryDate: yarnDyeingOrderTable.deliveryDate,
          customerGarmentsName: yarnDyeingOrderTable.customerGarmentsName,
          jobNo: yarnDyeingOrderTable.jobNo,
          unit: yarnDyeingOrderTable.unit,
          factoryId: yarnDyeingOrderTable.factoryId,
          factoryName: factoriesTable.name,
          buyerName: yarnDyeingOrderTable.buyerName,
          buyerAddress: yarnDyeingOrderTable.buyerAddress,
          attn: yarnDyeingOrderTable.attn,
          fromPerson: yarnDyeingOrderTable.fromPerson,
          yarnType: yarnDyeingOrderTable.yarnType,
          remarks: yarnDyeingOrderTable.remarks,
          processLossPct: yarnDyeingOrderTable.processLossPct,
          processLossKg: yarnDyeingOrderTable.processLossKg,
          grandTotalKg: yarnDyeingOrderTable.grandTotalKg,
          status: yarnDyeingOrderTable.status,
          createdAt: yarnDyeingOrderTable.createdAt,
        })
        .from(yarnDyeingOrderTable)
        .leftJoin(factoriesTable, eq(yarnDyeingOrderTable.factoryId, factoriesTable.id))
        .where(whereClause)
        .orderBy(desc(yarnDyeingOrderTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(yarnDyeingOrderTable)
        .where(whereClause),
    ]);

    const orderIds = rows.map((r) => r.id);
    let colorRowsMap: Record<number, typeof yarnDyeingOrderColorRowTable.$inferSelect[]> = {};
    if (orderIds.length > 0) {
      const allColorRows = await db
        .select()
        .from(yarnDyeingOrderColorRowTable)
        .where(sql`${yarnDyeingOrderColorRowTable.orderId} = ANY(${sql.raw(`ARRAY[${orderIds.join(",")}]::int[]`)})`);
      for (const cr of allColorRows) {
        if (!colorRowsMap[cr.orderId]) colorRowsMap[cr.orderId] = [];
        colorRowsMap[cr.orderId].push(cr);
      }
    }

    res.json({
      orders: rows.map((r) => ({
        ...r,
        colorRows: (colorRowsMap[r.id] ?? []).map((cr) => ({ ...cr, qtyKg: Number(cr.qtyKg) })),
      })),
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list yarn dyeing orders");
    res.status(500).json({ error: "Failed to list yarn dyeing orders" });
  }
});

router.post("/yarn-dyeing-orders", async (req, res): Promise<void> => {
  try {
    const body = CreateYarnDyeingOrderBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body", details: body.error.issues });
      return;
    }

    const orderNo = body.data.orderNo ?? generateOrderNo();

    const [order] = await db.insert(yarnDyeingOrderTable).values({
      orderNo,
      orderType: body.data.orderType,
      receiveDate: body.data.receiveDate,
      deliveryDate: body.data.deliveryDate ?? null,
      customerGarmentsName: body.data.customerGarmentsName ?? null,
      jobNo: body.data.jobNo ?? null,
      unit: body.data.unit ?? null,
      factoryId: body.data.factoryId ?? null,
      buyerName: body.data.buyerName ?? null,
      buyerAddress: body.data.buyerAddress ?? null,
      attn: body.data.attn ?? null,
      fromPerson: body.data.fromPerson ?? null,
      yarnType: body.data.yarnType ?? null,
      processLossPct: body.data.processLossPct != null ? String(body.data.processLossPct) : null,
      processLossKg: body.data.processLossKg != null ? String(body.data.processLossKg) : null,
      grandTotalKg: body.data.grandTotalKg != null ? String(body.data.grandTotalKg) : null,
      status: "Received",
      createdBy: req.user ? req.user.id : null,
    } as any).returning();

    const colorRowsInput = body.data.colorRows as Array<{
      yarnCount?: string;
      colorName: string;
      colorRef?: string;
      qtyKg: number;
      remarks?: string;
    }>;

    let colorRows: typeof yarnDyeingOrderColorRowTable.$inferSelect[] = [];
    if (colorRowsInput && colorRowsInput.length > 0) {
      colorRows = await db.insert(yarnDyeingOrderColorRowTable).values(
        colorRowsInput.map((r) => ({
          orderId: order.id,
          yarnCount: r.yarnCount ?? null,
          colorName: r.colorName,
          colorRef: r.colorRef ?? null,
          qtyKg: String(r.qtyKg),
          remarks: r.remarks ?? null,
        }))
      ).returning();
    }

    res.status(201).json({
      ...order,
      factoryName: null,
      colorRows: colorRows.map((r) => ({ ...r, qtyKg: Number(r.qtyKg) })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create yarn dyeing order");
    res.status(500).json({ error: "Failed to create yarn dyeing order" });
  }
});

router.get("/yarn-dyeing-orders/:id", async (req, res): Promise<void> => {
  try {
    const params = GetYarnDyeingOrderParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [row] = await db
      .select({
        id: yarnDyeingOrderTable.id,
        orderNo: yarnDyeingOrderTable.orderNo,
        orderType: yarnDyeingOrderTable.orderType,
        receiveDate: yarnDyeingOrderTable.receiveDate,
        deliveryDate: yarnDyeingOrderTable.deliveryDate,
        customerGarmentsName: yarnDyeingOrderTable.customerGarmentsName,
        jobNo: yarnDyeingOrderTable.jobNo,
        unit: yarnDyeingOrderTable.unit,
        factoryId: yarnDyeingOrderTable.factoryId,
        factoryName: factoriesTable.name,
        buyerName: yarnDyeingOrderTable.buyerName,
        buyerAddress: yarnDyeingOrderTable.buyerAddress,
        attn: yarnDyeingOrderTable.attn,
        fromPerson: yarnDyeingOrderTable.fromPerson,
        yarnType: yarnDyeingOrderTable.yarnType,
        remarks: yarnDyeingOrderTable.remarks,
        processLossPct: yarnDyeingOrderTable.processLossPct,
        processLossKg: yarnDyeingOrderTable.processLossKg,
        grandTotalKg: yarnDyeingOrderTable.grandTotalKg,
        status: yarnDyeingOrderTable.status,
        createdAt: yarnDyeingOrderTable.createdAt,
      })
      .from(yarnDyeingOrderTable)
      .leftJoin(factoriesTable, eq(yarnDyeingOrderTable.factoryId, factoriesTable.id))
      .where(eq(yarnDyeingOrderTable.id, params.data.id));

    if (!row) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const colorRows = await db
      .select()
      .from(yarnDyeingOrderColorRowTable)
      .where(eq(yarnDyeingOrderColorRowTable.orderId, params.data.id));

    res.json({
      ...row,
      colorRows: colorRows.map((r) => ({ ...r, qtyKg: Number(r.qtyKg) })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get yarn dyeing order");
    res.status(500).json({ error: "Failed to get yarn dyeing order" });
  }
});

router.patch("/yarn-dyeing-orders/:id", async (req, res): Promise<void> => {
  try {
    const params = UpdateYarnDyeingOrderParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = UpdateYarnDyeingOrderBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (body.data.orderType !== undefined) updateData.orderType = body.data.orderType;
    if (body.data.receiveDate !== undefined) updateData.receiveDate = body.data.receiveDate;
    if (body.data.deliveryDate !== undefined) updateData.deliveryDate = body.data.deliveryDate;
    if (body.data.customerGarmentsName !== undefined) updateData.customerGarmentsName = body.data.customerGarmentsName;
    if (body.data.jobNo !== undefined) updateData.jobNo = body.data.jobNo;
    if (body.data.unit !== undefined) updateData.unit = body.data.unit;
    if (body.data.factoryId !== undefined) updateData.factoryId = body.data.factoryId;
    if (body.data.buyerName !== undefined) updateData.buyerName = body.data.buyerName;
    if (body.data.buyerAddress !== undefined) updateData.buyerAddress = body.data.buyerAddress;
    if (body.data.attn !== undefined) updateData.attn = body.data.attn;
    if (body.data.fromPerson !== undefined) updateData.fromPerson = body.data.fromPerson;
    if (body.data.yarnType !== undefined) updateData.yarnType = body.data.yarnType;
    if (body.data.processLossPct !== undefined) updateData.processLossPct = body.data.processLossPct != null ? String(body.data.processLossPct) : null;
    if (body.data.processLossKg !== undefined) updateData.processLossKg = body.data.processLossKg != null ? String(body.data.processLossKg) : null;
    if (body.data.grandTotalKg !== undefined) updateData.grandTotalKg = body.data.grandTotalKg != null ? String(body.data.grandTotalKg) : null;
    if (body.data.status !== undefined) updateData.status = body.data.status;

    const [order] = await db
      .update(yarnDyeingOrderTable)
      .set(updateData)
      .where(eq(yarnDyeingOrderTable.id, params.data.id))
      .returning();

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (Array.isArray(body.data.colorRows) && body.data.colorRows.length > 0) {
      await db
        .delete(yarnDyeingOrderColorRowTable)
        .where(eq(yarnDyeingOrderColorRowTable.orderId, order.id));

      await db.insert(yarnDyeingOrderColorRowTable).values(
        body.data.colorRows.map((r: any) => ({
          orderId: order.id,
          yarnCount: r.yarnCount ?? null,
          colorName: r.colorName,
          colorRef: r.colorRef ?? null,
          qtyKg: String(r.qtyKg),
          remarks: r.remarks ?? null,
        }))
      );
    }

    res.json({ ...order, factoryName: null });
  } catch (err) {
    req.log.error({ err }, "Failed to update yarn dyeing order");
    res.status(500).json({ error: "Failed to update yarn dyeing order" });
  }
});

router.delete("/yarn-dyeing-orders/:id", async (req, res): Promise<void> => {
  try {
    const params = DeleteYarnDyeingOrderParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    await db.delete(yarnDyeingOrderTable).where(eq(yarnDyeingOrderTable.id, params.data.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete yarn dyeing order");
    res.status(500).json({ error: "Failed to delete yarn dyeing order" });
  }
});

export default router;
