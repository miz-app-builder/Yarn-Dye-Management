import { Router } from "express";
import { db, colorsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";

const router = Router();

router.get("/colors", async (req, res): Promise<void> => {
  try {
    const includeArchived = req.query.includeArchived === "true";
    const search = req.query.search as string | undefined;
    let query = db.select().from(colorsTable).$dynamic();
    const conditions = [];
    if (!includeArchived) conditions.push(eq(colorsTable.status, true));
    if (search) conditions.push(ilike(colorsTable.shadeName, `%${search}%`));
    if (conditions.length > 0) {
      const { and } = await import("drizzle-orm");
      query = query.where(and(...conditions));
    }
    const rows = await query.orderBy(colorsTable.shadeName);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list colors");
    res.status(500).json({ error: "Failed to list colors" });
  }
});

router.post("/colors", async (req, res): Promise<void> => {
  try {
    const { shadeName, shadeRef, category, hexCode } = req.body;
    if (!shadeName) {
      res.status(400).json({ error: "shadeName is required" });
      return;
    }
    const [row] = await db.insert(colorsTable).values({
      shadeName,
      shadeRef: shadeRef ?? null,
      category: category ?? null,
      hexCode: hexCode ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create color");
    res.status(500).json({ error: "Failed to create color" });
  }
});

router.get("/colors/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.select().from(colorsTable).where(eq(colorsTable.id, id));
    if (!row) { res.status(404).json({ error: "Color not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to get color");
    res.status(500).json({ error: "Failed to get color" });
  }
});

router.patch("/colors/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const { shadeName, shadeRef, category, hexCode, status } = req.body;
    const updateData: Record<string, unknown> = {};
    if (shadeName !== undefined) updateData.shadeName = shadeName;
    if (shadeRef !== undefined) updateData.shadeRef = shadeRef;
    if (category !== undefined) updateData.category = category;
    if (hexCode !== undefined) updateData.hexCode = hexCode;
    if (status !== undefined) updateData.status = status;
    const [row] = await db.update(colorsTable).set(updateData).where(eq(colorsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Color not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update color");
    res.status(500).json({ error: "Failed to update color" });
  }
});

router.delete("/colors/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.update(colorsTable).set({ status: false }).where(eq(colorsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Color not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to archive color");
    res.status(500).json({ error: "Failed to archive color" });
  }
});

export default router;
