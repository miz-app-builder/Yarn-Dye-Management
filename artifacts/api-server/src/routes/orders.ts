import { Router } from "express";
import { db, ordersTable, factoriesTable, orderPhotosTable, orderStatusHistoryTable, orderColorRowsTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, sql, desc } from "drizzle-orm";
import {
  CreateOrderBody,
  UpdateOrderBody,
  UpdateOrderParams,
  GetOrderParams,
  DeleteOrderParams,
  ListOrdersQueryParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusParams,
  AddOrderPhotoBody,
  AddOrderPhotoParams,
  ListOrderPhotosParams,
  DeleteOrderPhotoParams,
} from "@workspace/api-zod";

const router = Router();

function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ORD-${y}${m}${d}-${rand}`;
}

router.get("/orders", async (req, res): Promise<void> => {
  try {
    const q = ListOrdersQueryParams.safeParse(req.query);
    const params = (q.success ? q.data : {}) as NonNullable<typeof q.data>;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (params.factoryId) conditions.push(eq(ordersTable.factoryId, params.factoryId));
    if (params.orderType) conditions.push(eq(ordersTable.orderType, params.orderType));
    if (params.status) conditions.push(eq(ordersTable.status, params.status));
    if (params.dateFrom) conditions.push(gte(ordersTable.receiveDate, String(params.dateFrom)));
    if (params.dateTo) conditions.push(lte(ordersTable.receiveDate, String(params.dateTo)));
    if (params.buyerName) conditions.push(ilike(ordersTable.buyerName, `%${params.buyerName}%`));
    if (params.color) conditions.push(ilike(ordersTable.color, `%${params.color}%`));
    if (params.search) {
      conditions.push(
        sql`(${ilike(ordersTable.orderNo, `%${params.search}%`)} OR ${ilike(ordersTable.buyerName, `%${params.search}%`)} OR ${ilike(ordersTable.color, `%${params.search}%`)})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
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
        .where(whereClause)
        .orderBy(desc(ordersTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(whereClause),
    ]);

    res.json({
      orders: rows.map(r => ({ ...r, quantityKg: Number(r.quantityKg) })),
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Failed to list orders" });
  }
});

router.post("/orders", async (req, res): Promise<void> => {
  try {
    const body = CreateOrderBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const orderNo = body.data.orderNo ?? generateOrderNo();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [order] = await db.insert(ordersTable).values({
      orderNo,
      buyerName: body.data.buyerName,
      factoryId: body.data.factoryId ?? null,
      orderType: body.data.orderType,
      yarnType: body.data.yarnType,
      color: body.data.color,
      quantityKg: String(body.data.quantityKg),
      receiveDate: body.data.receiveDate,
      deliveryDate: body.data.deliveryDate ?? null,
      remarks: body.data.remarks ?? null,
      status: "Received",
      createdBy: req.user ? req.user.id : null,
    } as any).returning();

    const colorRowsInput = (body.data as any).colorRows as Array<{ yarnCount?: string; colorName: string; colorRef?: string; qtyKg: number }> | undefined;
    let colorRows: typeof orderColorRowsTable.$inferSelect[] = [];
    if (colorRowsInput && colorRowsInput.length > 0) {
      colorRows = await db.insert(orderColorRowsTable).values(
        colorRowsInput.map((r) => ({
          orderId: order.id,
          yarnCount: r.yarnCount ?? null,
          colorName: r.colorName,
          colorRef: r.colorRef ?? null,
          qtyKg: String(r.qtyKg),
        }))
      ).returning();
    }

    await db.insert(orderStatusHistoryTable).values({
      orderId: order.id,
      status: "Received",
      updatedBy: req.user ? req.user.id : null,
    });

    res.status(201).json({
      ...order,
      quantityKg: Number(order.quantityKg),
      factoryName: null,
      colorRows: colorRows.map((r) => ({ ...r, qtyKg: Number(r.qtyKg) })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  try {
    const params = GetOrderParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [row] = await db
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
      .where(eq(ordersTable.id, params.data.id));

    if (!row) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const [photos, statusHistory, colorRows] = await Promise.all([
      db.select().from(orderPhotosTable).where(eq(orderPhotosTable.orderId, params.data.id)).orderBy(desc(orderPhotosTable.createdAt)),
      db.select().from(orderStatusHistoryTable).where(eq(orderStatusHistoryTable.orderId, params.data.id)).orderBy(desc(orderStatusHistoryTable.createdAt)),
      db.select().from(orderColorRowsTable).where(eq(orderColorRowsTable.orderId, params.data.id)),
    ]);

    res.json({
      ...row,
      quantityKg: Number(row.quantityKg),
      colorRows: colorRows.map((r) => ({ ...r, qtyKg: Number(r.qtyKg) })),
      photos,
      statusHistory,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Failed to get order" });
  }
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  try {
    const params = UpdateOrderParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = UpdateOrderBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (body.data.buyerName !== undefined) updateData.buyerName = body.data.buyerName;
    if (body.data.factoryId !== undefined) updateData.factoryId = body.data.factoryId;
    if (body.data.orderType !== undefined) updateData.orderType = body.data.orderType;
    if (body.data.yarnType !== undefined) updateData.yarnType = body.data.yarnType;
    if (body.data.color !== undefined) updateData.color = body.data.color;
    if (body.data.quantityKg !== undefined) updateData.quantityKg = String(body.data.quantityKg);
    if (body.data.receiveDate !== undefined) updateData.receiveDate = body.data.receiveDate;
    if (body.data.deliveryDate !== undefined) updateData.deliveryDate = body.data.deliveryDate;
    if (body.data.status !== undefined) updateData.status = body.data.status;
    if (body.data.remarks !== undefined) updateData.remarks = body.data.remarks;

    const [order] = await db
      .update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, params.data.id))
      .returning();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ ...order, quantityKg: Number(order.quantityKg), factoryName: null });
  } catch (err) {
    req.log.error({ err }, "Failed to update order");
    res.status(500).json({ error: "Failed to update order" });
  }
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  try {
    const params = DeleteOrderParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    await db.delete(ordersTable).where(eq(ordersTable.id, params.data.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete order");
    res.status(500).json({ error: "Failed to delete order" });
  }
});

router.post("/orders/:id/status", async (req, res): Promise<void> => {
  try {
    const params = UpdateOrderStatusParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = UpdateOrderStatusBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const [order] = await db
      .update(ordersTable)
      .set({ status: body.data.status })
      .where(eq(ordersTable.id, params.data.id))
      .returning();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await db.insert(orderStatusHistoryTable).values({
      orderId: params.data.id,
      status: body.data.status,
      remarks: body.data.remarks ?? null,
      updatedBy: req.user ? req.user.id : null,
    });

    res.json({ ...order, quantityKg: Number(order.quantityKg), factoryName: null });
  } catch (err) {
    req.log.error({ err }, "Failed to update order status");
    res.status(500).json({ error: "Failed to update order status" });
  }
});

router.get("/orders/:id/photos", async (req, res): Promise<void> => {
  try {
    const params = ListOrderPhotosParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const photos = await db.select().from(orderPhotosTable).where(eq(orderPhotosTable.orderId, params.data.id)).orderBy(desc(orderPhotosTable.createdAt));
    res.json(photos);
  } catch (err) {
    req.log.error({ err }, "Failed to list photos");
    res.status(500).json({ error: "Failed to list photos" });
  }
});

router.post("/orders/:id/photos", async (req, res): Promise<void> => {
  try {
    const params = AddOrderPhotoParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = AddOrderPhotoBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const [photo] = await db.insert(orderPhotosTable).values({
      orderId: params.data.id,
      photoUrl: body.data.photoUrl,
      photoType: body.data.photoType,
      uploadedBy: req.user ? req.user.id : null,
    }).returning();
    res.status(201).json(photo);
  } catch (err) {
    req.log.error({ err }, "Failed to add photo");
    res.status(500).json({ error: "Failed to add photo" });
  }
});

router.delete("/orders/:id/photos/:photoId", async (req, res): Promise<void> => {
  try {
    const params = DeleteOrderPhotoParams.safeParse({ id: Number(req.params.id), photoId: Number(req.params.photoId) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    await db.delete(orderPhotosTable).where(
      and(eq(orderPhotosTable.id, params.data.photoId), eq(orderPhotosTable.orderId, params.data.id))
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete photo");
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

export default router;
