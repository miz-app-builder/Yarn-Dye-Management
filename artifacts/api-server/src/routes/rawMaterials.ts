import { Router } from "express";
import { db } from "@workspace/db";
import { rawMaterialsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

const rawMaterialInputSchema = z.object({
  yarnType: z.string().min(1),
  yarnCount: z.string().min(1),
  price: z.string().min(1),
});

const rawMaterialUpdateSchema = rawMaterialInputSchema.partial();

router.get("/raw-materials", async (req, res): Promise<void> => {
  const items = await db
    .select()
    .from(rawMaterialsTable)
    .orderBy(rawMaterialsTable.createdAt);
  res.json(items);
});

router.post("/raw-materials", async (req, res): Promise<void> => {
  const parsed = rawMaterialInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(rawMaterialsTable)
    .values(parsed.data as any)
    .returning();
  res.status(201).json(created);
});

router.patch("/raw-materials/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = rawMaterialUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(rawMaterialsTable)
    .set(parsed.data as any)
    .where(eq(rawMaterialsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/raw-materials/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(rawMaterialsTable).where(eq(rawMaterialsTable.id, id));
  res.status(204).send();
});

export default router;
