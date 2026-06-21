import { pgTable, serial, text, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const orderColorRowsTable = pgTable("order_color_rows", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  yarnCount: text("yarn_count"),
  colorName: text("color_name").notNull(),
  colorRef: text("color_ref"),
  qtyKg: numeric("qty_kg", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderColorRowSchema = createInsertSchema(orderColorRowsTable).omit({ id: true });
export type InsertOrderColorRow = z.infer<typeof insertOrderColorRowSchema>;
export type OrderColorRow = typeof orderColorRowsTable.$inferSelect;
