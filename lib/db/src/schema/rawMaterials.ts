import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rawMaterialsTable = pgTable("raw_materials", {
  id: serial("id").primaryKey(),
  yarnType: text("yarn_type").notNull(),
  yarnCount: text("yarn_count").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRawMaterialSchema = createInsertSchema(rawMaterialsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRawMaterial = z.infer<typeof insertRawMaterialSchema>;
export type RawMaterial = typeof rawMaterialsTable.$inferSelect;
