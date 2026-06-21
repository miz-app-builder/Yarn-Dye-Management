import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customerGarmentsTable = pgTable("customer_garments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerGarmentsSchema = createInsertSchema(customerGarmentsTable).omit({ id: true, createdAt: true });
export type InsertCustomerGarments = z.infer<typeof insertCustomerGarmentsSchema>;
export type CustomerGarments = typeof customerGarmentsTable.$inferSelect;
