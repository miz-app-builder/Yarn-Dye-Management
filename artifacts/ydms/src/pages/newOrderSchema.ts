import { z } from "zod";

export const colorRowSchema = z.object({
  yarnCount: z.string().optional(),
  colorName: z.string().min(1, "Required"),
  colorRef: z.string().optional(),
  qtyKg: z.coerce.number().min(0.01, "Must be > 0"),
});

export const formSchema = z.object({
  orderNo: z.string().optional(),
  orderType: z.enum(["Sample", "Bulk"]),
  date: z.string().min(1, "Required"),
  factoryId: z.coerce.number({ required_error: "Required" }).min(1, "Required"),
  buyerName: z.string().min(1, "Required"),
  buyerAddress: z.string().optional(),
  attn: z.string().optional(),
  from: z.string().optional(),
  yarnType: z.string().optional(),
  customerGarmentsName: z.string().optional(),
  jobNo: z.string().optional(),
  unit: z.string().optional(),
  deliveryDate: z.string().optional(),
  colorRows: z.array(colorRowSchema).min(1),
});

export type FormValues = z.infer<typeof formSchema>;
