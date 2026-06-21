import { pgTable, serial, text, date, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { factoriesTable } from "./factories";

export const yarnDyeingOrderTable = pgTable("yarn_dyeing_order", {
  id: serial("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(),
  orderType: text("order_type").notNull(),
  receiveDate: date("receive_date", { mode: "string" }).notNull(),
  deliveryDate: date("delivery_date", { mode: "string" }),
  customerGarmentsName: text("customer_garments_name"),
  jobNo: text("job_no"),
  unit: text("unit"),
  factoryId: integer("factory_id").references(() => factoriesTable.id),
  buyerName: text("buyer_name"),
  buyerAddress: text("buyer_address"),
  attn: text("attn"),
  fromPerson: text("from_person"),
  status: text("status").notNull().default("Received"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertYarnDyeingOrderSchema = createInsertSchema(yarnDyeingOrderTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertYarnDyeingOrder = z.infer<typeof insertYarnDyeingOrderSchema>;
export type YarnDyeingOrder = typeof yarnDyeingOrderTable.$inferSelect;
