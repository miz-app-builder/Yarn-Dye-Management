import { pgTable, serial, text, date, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const labDipsTable = pgTable("lab_dips", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  labDipNo: text("lab_dip_no").notNull(),
  shadeRef: text("shade_ref"),
  submissionDate: date("submission_date", { mode: "string" }).notNull(),
  approvalDate: date("approval_date", { mode: "string" }),
  status: text("status").notNull().default("Submitted"),
  remarks: text("remarks"),
  submittedBy: text("submitted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLabDipSchema = createInsertSchema(labDipsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLabDip = z.infer<typeof insertLabDipSchema>;
export type LabDip = typeof labDipsTable.$inferSelect;
