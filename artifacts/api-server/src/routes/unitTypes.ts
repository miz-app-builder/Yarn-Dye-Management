import { Router } from "express";
import { db, unitTypesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/unit-types", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(unitTypesTable).orderBy(unitTypesTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list unit types");
    res.status(500).json({ error: "Failed to list unit types" });
  }
});

router.post("/unit-types", async (req, res): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [row] = await db
      .insert(unitTypesTable)
      .values({ name: name.trim() })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      const [existing] = await db
        .select()
        .from(unitTypesTable)
        .where(eq(unitTypesTable.name, name.trim()));
      res.status(200).json(existing);
      return;
    }
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create unit type");
    res.status(500).json({ error: "Failed to create unit type" });
  }
});

router.delete("/unit-types/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(unitTypesTable).where(eq(unitTypesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete unit type");
    res.status(500).json({ error: "Failed to delete unit type" });
  }
});

export default router;
