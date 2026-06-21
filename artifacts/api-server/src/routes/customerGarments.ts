import { Router } from "express";
import { db, customerGarmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/customer-garments", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(customerGarmentsTable).orderBy(customerGarmentsTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list customer garments");
    res.status(500).json({ error: "Failed to list customer garments" });
  }
});

router.post("/customer-garments", async (req, res): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [row] = await db
      .insert(customerGarmentsTable)
      .values({ name: name.trim() })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      const [existing] = await db
        .select()
        .from(customerGarmentsTable)
        .where(eq(customerGarmentsTable.name, name.trim()));
      res.status(200).json(existing);
      return;
    }
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create customer garments");
    res.status(500).json({ error: "Failed to create customer garments" });
  }
});

router.delete("/customer-garments/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(customerGarmentsTable).where(eq(customerGarmentsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer garments");
    res.status(500).json({ error: "Failed to delete customer garments" });
  }
});

export default router;
