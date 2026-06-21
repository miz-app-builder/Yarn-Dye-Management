import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buyersTable = pgTable("buyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  country: text("country"),
  status: boolean("status").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBuyerSchema = createInsertSchema(buyersTable).omit({ id: true, createdAt: true });
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;
export type Buyer = typeof buyersTable.$inferSelect;
