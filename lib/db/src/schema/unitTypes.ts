import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const unitTypesTable = pgTable("unit_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUnitTypeSchema = createInsertSchema(unitTypesTable).omit({ id: true, createdAt: true });
export type InsertUnitType = z.infer<typeof insertUnitTypeSchema>;
export type UnitType = typeof unitTypesTable.$inferSelect;
