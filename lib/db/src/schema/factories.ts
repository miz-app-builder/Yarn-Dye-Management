import { pgTable, serial, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const factoriesTable = pgTable("factories", {
  id: serial("id").primaryKey(),
  factoryCode: text("factory_code").notNull().unique(),
  name: text("name").notNull(),
  location: text("from"),
  address: text("address"),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  oiYarnTypeId: integer("oi_yarn_type_id"),
  dyeingPrice: numeric("dyeing_price", { precision: 10, scale: 2 }),
  status: boolean("status").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFactorySchema = createInsertSchema(factoriesTable).omit({ id: true, createdAt: true });
export type InsertFactory = z.infer<typeof insertFactorySchema>;
export type Factory = typeof factoriesTable.$inferSelect;
