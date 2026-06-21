import { Router } from "express";
import { db, buyersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/buyers", async (req, res): Promise<void> => {
  try {
    const includeArchived = req.query.includeArchived === "true";
    const buyers = await db
      .select()
      .from(buyersTable)
      .where(includeArchived ? undefined : eq(buyersTable.status, true))
      .orderBy(buyersTable.name);
    res.json(buyers);
  } catch (err) {
    req.log.error({ err }, "Failed to list buyers");
    res.status(500).json({ error: "Failed to list buyers" });
  }
});

router.post("/buyers", async (req, res): Promise<void> => {
  try {
    const { name, contactPerson, phone, email, address, country } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [buyer] = await db.insert(buyersTable).values({
      name,
      contactPerson: contactPerson ?? null,
      phone: phone ?? null,
      email: email ?? null,
      address: address ?? null,
      country: country ?? null,
    }).returning();
    res.status(201).json(buyer);
  } catch (err) {
    req.log.error({ err }, "Failed to create buyer");
    res.status(500).json({ error: "Failed to create buyer" });
  }
});

router.get("/buyers/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, id));
    if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
    res.json(buyer);
  } catch (err) {
    req.log.error({ err }, "Failed to get buyer");
    res.status(500).json({ error: "Failed to get buyer" });
  }
});

router.patch("/buyers/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const { name, contactPerson, phone, email, address, country, status } = req.body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (country !== undefined) updateData.country = country;
    if (status !== undefined) updateData.status = status;
    const [buyer] = await db.update(buyersTable).set(updateData).where(eq(buyersTable.id, id)).returning();
    if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
    res.json(buyer);
  } catch (err) {
    req.log.error({ err }, "Failed to update buyer");
    res.status(500).json({ error: "Failed to update buyer" });
  }
});

router.delete("/buyers/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [buyer] = await db.update(buyersTable).set({ status: false }).where(eq(buyersTable.id, id)).returning();
    if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
    res.json(buyer);
  } catch (err) {
    req.log.error({ err }, "Failed to archive buyer");
    res.status(500).json({ error: "Failed to archive buyer" });
  }
});

export default router;
