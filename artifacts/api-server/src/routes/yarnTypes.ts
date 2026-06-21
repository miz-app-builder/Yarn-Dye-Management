import { Router } from "express";
import { db, yarnTypesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/yarn-types", async (req, res): Promise<void> => {
  try {
    const includeArchived = req.query.includeArchived === "true";
    const rows = await db
      .select()
      .from(yarnTypesTable)
      .where(includeArchived ? undefined : eq(yarnTypesTable.status, true))
      .orderBy(yarnTypesTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list yarn types");
    res.status(500).json({ error: "Failed to list yarn types" });
  }
});

router.post("/yarn-types", async (req, res): Promise<void> => {
  try {
    const { name, composition, yarnCount, description } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [row] = await db.insert(yarnTypesTable).values({
      name,
      composition: composition ?? null,
      yarnCount: yarnCount ?? null,
      description: description ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create yarn type");
    res.status(500).json({ error: "Failed to create yarn type" });
  }
});

router.get("/yarn-types/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.select().from(yarnTypesTable).where(eq(yarnTypesTable.id, id));
    if (!row) { res.status(404).json({ error: "Yarn type not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to get yarn type");
    res.status(500).json({ error: "Failed to get yarn type" });
  }
});

router.patch("/yarn-types/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const { name, composition, yarnCount, description, status } = req.body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (composition !== undefined) updateData.composition = composition;
    if (yarnCount !== undefined) updateData.yarnCount = yarnCount;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    const [row] = await db.update(yarnTypesTable).set(updateData).where(eq(yarnTypesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Yarn type not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update yarn type");
    res.status(500).json({ error: "Failed to update yarn type" });
  }
});

router.delete("/yarn-types/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.update(yarnTypesTable).set({ status: false }).where(eq(yarnTypesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Yarn type not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to archive yarn type");
    res.status(500).json({ error: "Failed to archive yarn type" });
  }
});

export default router;
