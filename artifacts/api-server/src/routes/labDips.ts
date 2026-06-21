import { Router } from "express";
import { db, labDipsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/orders/:id/lab-dips", async (req, res): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) { res.status(400).json({ error: "Invalid order id" }); return; }
    const rows = await db.select().from(labDipsTable).where(eq(labDipsTable.orderId, orderId)).orderBy(desc(labDipsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list lab dips");
    res.status(500).json({ error: "Failed to list lab dips" });
  }
});

router.post("/orders/:id/lab-dips", async (req, res): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) { res.status(400).json({ error: "Invalid order id" }); return; }
    const { labDipNo, shadeRef, submissionDate, approvalDate, status, remarks } = req.body;
    if (!labDipNo || !submissionDate) {
      res.status(400).json({ error: "labDipNo and submissionDate are required" });
      return;
    }
    const [row] = await db.insert(labDipsTable).values({
      orderId,
      labDipNo,
      shadeRef: shadeRef ?? null,
      submissionDate,
      approvalDate: approvalDate ?? null,
      status: status ?? "Submitted",
      remarks: remarks ?? null,
      submittedBy: req.user ? req.user.id : null,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create lab dip");
    res.status(500).json({ error: "Failed to create lab dip" });
  }
});

router.patch("/orders/:id/lab-dips/:labDipId", async (req, res): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    const labDipId = Number(req.params.labDipId);
    if (!orderId || !labDipId) { res.status(400).json({ error: "Invalid params" }); return; }
    const { labDipNo, shadeRef, submissionDate, approvalDate, status, remarks } = req.body;
    const updateData: Record<string, unknown> = {};
    if (labDipNo !== undefined) updateData.labDipNo = labDipNo;
    if (shadeRef !== undefined) updateData.shadeRef = shadeRef;
    if (submissionDate !== undefined) updateData.submissionDate = submissionDate;
    if (approvalDate !== undefined) updateData.approvalDate = approvalDate;
    if (status !== undefined) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;
    const { and } = await import("drizzle-orm");
    const [row] = await db.update(labDipsTable).set(updateData).where(and(eq(labDipsTable.id, labDipId), eq(labDipsTable.orderId, orderId))).returning();
    if (!row) { res.status(404).json({ error: "Lab dip not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update lab dip");
    res.status(500).json({ error: "Failed to update lab dip" });
  }
});

router.delete("/orders/:id/lab-dips/:labDipId", async (req, res): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    const labDipId = Number(req.params.labDipId);
    if (!orderId || !labDipId) { res.status(400).json({ error: "Invalid params" }); return; }
    const { and } = await import("drizzle-orm");
    await db.delete(labDipsTable).where(and(eq(labDipsTable.id, labDipId), eq(labDipsTable.orderId, orderId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete lab dip");
    res.status(500).json({ error: "Failed to delete lab dip" });
  }
});

export default router;
