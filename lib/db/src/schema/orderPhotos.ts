import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const orderPhotosTable = pgTable("order_photos", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(),
  photoType: text("photo_type").notNull(),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderPhotoSchema = createInsertSchema(orderPhotosTable).omit({ id: true, createdAt: true });
export type InsertOrderPhoto = z.infer<typeof insertOrderPhotoSchema>;
export type OrderPhoto = typeof orderPhotosTable.$inferSelect;
