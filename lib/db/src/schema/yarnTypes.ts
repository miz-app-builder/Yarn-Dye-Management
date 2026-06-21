import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const yarnTypesTable = pgTable("yarn_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  composition: text("composition"),
  yarnCount: text("yarn_count"),
  description: text("description"),
  status: boolean("status").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertYarnTypeSchema = createInsertSchema(yarnTypesTable).omit({ id: true, createdAt: true });
export type InsertYarnType = z.infer<typeof insertYarnTypeSchema>;
export type YarnType = typeof yarnTypesTable.$inferSelect;
