import { pgTable, serial, text, numeric, date, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { factoriesTable } from "./factories";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(),
  buyerName: text("buyer_name").notNull(),
  buyerAddress: text("buyer_address"),
  attn: text("attn"),
  fromPerson: text("from_person"),
  customerGarmentsName: text("customer_garments_name"),
  jobNo: text("job_no"),
  unit: text("unit"),
  factoryId: integer("factory_id").references(() => factoriesTable.id),
  orderType: text("order_type").notNull(),
  yarnType: text("yarn_type").notNull(),
  color: text("color").notNull(),
  quantityKg: numeric("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  receiveDate: date("receive_date", { mode: "string" }).notNull(),
  deliveryDate: date("delivery_date", { mode: "string" }),
  status: text("status").notNull().default("Received"),
  remarks: text("remarks"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
