import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const colorsTable = pgTable("colors", {
  id: serial("id").primaryKey(),
  shadeName: text("shade_name").notNull(),
  shadeRef: text("shade_ref"),
  category: text("category"),
  hexCode: text("hex_code"),
  status: boolean("status").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertColorSchema = createInsertSchema(colorsTable).omit({ id: true, createdAt: true });
export type InsertColor = z.infer<typeof insertColorSchema>;
export type Color = typeof colorsTable.$inferSelect;
