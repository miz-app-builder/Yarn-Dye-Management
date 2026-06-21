import { pgTable, serial, text, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { yarnDyeingOrderTable } from "./yarnDyeingOrder";

export const yarnDyeingOrderColorRowTable = pgTable("yarn_dyeing_order_color_row", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => yarnDyeingOrderTable.id, { onDelete: "cascade" }),
  yarnCount: text("yarn_count"),
  colorName: text("color_name").notNull(),
  colorRef: text("color_ref"),
  qtyKg: numeric("qty_kg", { precision: 10, scale: 2 }).notNull(),
  remarks: text("remarks"),
});

export const insertYarnDyeingOrderColorRowSchema = createInsertSchema(yarnDyeingOrderColorRowTable).omit({ id: true });
export type InsertYarnDyeingOrderColorRow = z.infer<typeof insertYarnDyeingOrderColorRowSchema>;
export type YarnDyeingOrderColorRow = typeof yarnDyeingOrderColorRowTable.$inferSelect;
