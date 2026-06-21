import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateUserRoleParams, UpdateUserRoleBody } from "@workspace/api-zod";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    res.json(users.map(u => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
      email: u.email,
      role: u.role ?? "operator",
      profileImageUrl: u.profileImageUrl,
      createdAt: u.createdAt,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Failed to list users" });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const params = UpdateUserRoleParams.safeParse({ id: req.params.id });
    if (!params.success) return res.status(400).json({ error: "Invalid id" });
    const body = UpdateUserRoleBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid request body" });

    const [user] = await db
      .update(usersTable)
      .set({ role: body.data.role })
      .where(eq(usersTable.id, params.data.id))
      .returning();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
      email: user.email,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update user role");
    res.status(500).json({ error: "Failed to update user role" });
  }
});

export default router;
