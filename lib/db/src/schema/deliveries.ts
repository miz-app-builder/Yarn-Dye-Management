import { pgTable, serial, text, date, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { yarnDyeingOrderTable } from "./yarnDyeingOrder";

export const deliveriesTable = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => yarnDyeingOrderTable.id, { onDelete: "cascade" }),
  challanNo: text("challan_no").notNull(),
  deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
  quantityKg: numeric("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  transporter: text("transporter"),
  vehicleNo: text("vehicle_no"),
  receivedBy: text("received_by"),
  remarks: text("remarks"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({ id: true, createdAt: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
