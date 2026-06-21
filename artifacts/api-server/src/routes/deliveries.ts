import { Router } from "express";
import { db, deliveriesTable, ordersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/orders/:id/deliveries", async (req, res): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) { res.status(400).json({ error: "Invalid order id" }); return; }
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.orderId, orderId)).orderBy(desc(deliveriesTable.createdAt));
    res.json(rows.map(r => ({ ...r, quantityKg: Number(r.quantityKg) })));
  } catch (err) {
    req.log.error({ err }, "Failed to list deliveries");
    res.status(500).json({ error: "Failed to list deliveries" });
  }
});

router.post("/orders/:id/deliveries", async (req, res): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) { res.status(400).json({ error: "Invalid order id" }); return; }
    const { challanNo, deliveryDate, quantityKg, transporter, vehicleNo, receivedBy, remarks } = req.body;
    if (!challanNo || !deliveryDate || quantityKg == null) {
      res.status(400).json({ error: "challanNo, deliveryDate and quantityKg are required" });
      return;
    }
    const [order] = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    const [row] = await db.insert(deliveriesTable).values({
      orderId,
      challanNo,
      deliveryDate,
      quantityKg: String(quantityKg),
      transporter: transporter ?? null,
      vehicleNo: vehicleNo ?? null,
      receivedBy: receivedBy ?? null,
      remarks: remarks ?? null,
      createdBy: req.user ? req.user.id : null,
    }).returning();
    res.status(201).json({ ...row, quantityKg: Number(row.quantityKg) });
  } catch (err) {
    req.log.error({ err }, "Failed to create delivery");
    res.status(500).json({ error: "Failed to create delivery" });
  }
});

router.patch("/orders/:id/deliveries/:deliveryId", async (req, res): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    const deliveryId = Number(req.params.deliveryId);
    if (!orderId || !deliveryId) { res.status(400).json({ error: "Invalid params" }); return; }
    const { challanNo, deliveryDate, quantityKg, transporter, vehicleNo, receivedBy, remarks } = req.body;
    const updateData: Record<string, unknown> = {};
    if (challanNo !== undefined) updateData.challanNo = challanNo;
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate;
    if (quantityKg !== undefined) updateData.quantityKg = String(quantityKg);
    if (transporter !== undefined) updateData.transporter = transporter;
    if (vehicleNo !== undefined) updateData.vehicleNo = vehicleNo;
    if (receivedBy !== undefined) updateData.receivedBy = receivedBy;
    if (remarks !== undefined) updateData.remarks = remarks;
    const { and } = await import("drizzle-orm");
    const [row] = await db.update(deliveriesTable).set(updateData).where(and(eq(deliveriesTable.id, deliveryId), eq(deliveriesTable.orderId, orderId))).returning();
    if (!row) { res.status(404).json({ error: "Delivery not found" }); return; }
    res.json({ ...row, quantityKg: Number(row.quantityKg) });
  } catch (err) {
    req.log.error({ err }, "Failed to update delivery");
    res.status(500).json({ error: "Failed to update delivery" });
  }
});

router.delete("/orders/:id/deliveries/:deliveryId", async (req, res): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    const deliveryId = Number(req.params.deliveryId);
    if (!orderId || !deliveryId) { res.status(400).json({ error: "Invalid params" }); return; }
    const { and } = await import("drizzle-orm");
    await db.delete(deliveriesTable).where(and(eq(deliveriesTable.id, deliveryId), eq(deliveriesTable.orderId, orderId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete delivery");
    res.status(500).json({ error: "Failed to delete delivery" });
  }
});

export default router;
