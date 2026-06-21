import { Router } from "express";
import { db, factoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateFactoryBody,
  UpdateFactoryBody,
  UpdateFactoryParams,
  GetFactoryParams,
  ArchiveFactoryParams,
  ListFactoriesQueryParams,
} from "@workspace/api-zod";

const router = Router();

function generateFactoryCode(): string {
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `FC-${rand}`;
}

router.get("/factories", async (req, res): Promise<void> => {
  try {
    const query = ListFactoriesQueryParams.safeParse(req.query);
    const includeArchived = query.success ? query.data.includeArchived : false;

    const factories = await db
      .select()
      .from(factoriesTable)
      .where(includeArchived ? undefined : eq(factoriesTable.status, true));

    res.json(factories.map(f => ({
      id: f.id,
      factoryCode: f.factoryCode,
      name: f.name,
      location: f.location,
      address: f.address,
      contactPerson: f.contactPerson,
      phone: f.phone,
      email: f.email,
      yarnTypeId: f.yarnTypeId,
      dyeingPrice: f.dyeingPrice,
      processLossBulk: f.processLossBulk,
      processLossSample: f.processLossSample,
      status: f.status,
      createdAt: f.createdAt,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list factories");
    res.status(500).json({ error: "Failed to list factories" });
  }
});

router.post("/factories", async (req, res): Promise<void> => {
  try {
    const body = CreateFactoryBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [factory] = await db.insert(factoriesTable).values({
      factoryCode: generateFactoryCode(),
      name: body.data.name,
      location: body.data.location ?? null,
      address: body.data.address ?? null,
      contactPerson: body.data.contactPerson ?? null,
      phone: body.data.phone ?? null,
      email: body.data.email ?? null,
      yarnTypeId: body.data.yarnTypeId ?? null,
      dyeingPrice: body.data.dyeingPrice ?? null,
    } as any).returning();
    res.status(201).json(factory);
  } catch (err) {
    req.log.error({ err }, "Failed to create factory");
    res.status(500).json({ error: "Failed to create factory" });
  }
});

router.get("/factories/:id", async (req, res): Promise<void> => {
  try {
    const params = GetFactoryParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [factory] = await db.select().from(factoriesTable).where(eq(factoriesTable.id, params.data.id));
    if (!factory) {
      res.status(404).json({ error: "Factory not found" });
      return;
    }
    res.json(factory);
  } catch (err) {
    req.log.error({ err }, "Failed to get factory");
    res.status(500).json({ error: "Failed to get factory" });
  }
});

router.patch("/factories/:id", async (req, res): Promise<void> => {
  try {
    const params = UpdateFactoryParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = UpdateFactoryBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const [factory] = await db
      .update(factoriesTable)
      .set({ ...body.data } as any)
      .where(eq(factoriesTable.id, params.data.id))
      .returning();
    if (!factory) {
      res.status(404).json({ error: "Factory not found" });
      return;
    }
    res.json(factory);
  } catch (err) {
    req.log.error({ err }, "Failed to update factory");
    res.status(500).json({ error: "Failed to update factory" });
  }
});

router.delete("/factories/:id", async (req, res): Promise<void> => {
  try {
    const params = ArchiveFactoryParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [factory] = await db
      .update(factoriesTable)
      .set({ status: false })
      .where(eq(factoriesTable.id, params.data.id))
      .returning();
    if (!factory) {
      res.status(404).json({ error: "Factory not found" });
      return;
    }
    res.json(factory);
  } catch (err) {
    req.log.error({ err }, "Failed to archive factory");
    res.status(500).json({ error: "Failed to archive factory" });
  }
});

export default router;
