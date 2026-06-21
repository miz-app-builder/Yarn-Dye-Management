import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateOrder, useListFactories, getListOrdersQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";

const colorRowSchema = z.object({
  colorName: z.string().min(1, "Required"),
  colorApproval: z.string().min(1, "Required"),
  qtyKg: z.coerce.number().min(0.01, "Must be > 0"),
  factory: z.string().optional(),
  jobNo: z.string().optional(),
  unit: z.string().optional(),
});

const formSchema = z.object({
  orderNo: z.string().optional(),
  orderType: z.enum(["Sample", "Bulk"]),
  date: z.string().min(1, "Required"),
  buyerName: z.string().min(1, "Required"),
  buyerAddress: z.string().optional(),
  attn: z.string().optional(),
  from: z.string().optional(),
  factoryId: z.coerce.number().optional(),
  yarnType: z.string().optional(),
  deliveryDate: z.string().optional(),
  colorRows: z.array(colorRowSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

export default function NewOrderPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: factories } = useListFactories();
  const createOrder = useCreateOrder();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderType: "Sample",
      date: new Date().toISOString().split("T")[0],
      colorRows: [{ colorName: "", colorApproval: "S/OK", qtyKg: 0, factory: "", jobNo: "", unit: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "colorRows" });

  const watchedRows = form.watch("colorRows");
  const totalQty = watchedRows.reduce((sum, r) => sum + (Number(r.qtyKg) || 0), 0);

  function onSubmit(values: FormValues) {
    const firstRow = values.colorRows[0];
    const remarksParts = [];
    if (firstRow.factory) remarksParts.push(`Factory: ${firstRow.factory}`);
    if (firstRow.jobNo) remarksParts.push(`Job: ${firstRow.jobNo}`);
    if (firstRow.unit) remarksParts.push(`Unit: ${firstRow.unit}`);

    const extraRows = values.colorRows.slice(1).map((r, i) => {
      const parts = [];
      if (r.factory) parts.push(`Factory: ${r.factory}`);
      if (r.jobNo) parts.push(`Job: ${r.jobNo}`);
      if (r.unit) parts.push(`Unit: ${r.unit}`);
      return `Row ${i + 2}: ${r.colorName} | ${r.colorApproval} | ${r.qtyKg} Kg | ${parts.join(", ")}`;
    });

    const allRemarks = [...remarksParts, ...extraRows].join("\n");

    createOrder.mutate(
      {
        data: {
          orderNo: values.orderNo || undefined,
          orderType: values.orderType,
          buyerName: values.buyerName,
          factoryId: values.factoryId || undefined,
          yarnType: values.yarnType || firstRow.colorName,
          color: firstRow.colorName,
          quantityKg: totalQty,
          receiveDate: values.date,
          deliveryDate: values.deliveryDate || undefined,
          remarks: [
            values.attn ? `Attn: ${values.attn}` : "",
            values.from ? `From: ${values.from}` : "",
            values.buyerAddress ? `Address: ${values.buyerAddress}` : "",
            `Color Approval: ${firstRow.colorApproval}`,
            allRemarks,
          ]
            .filter(Boolean)
            .join("\n"),
        } as any,
      },
      {
        onSuccess: (data) => {
          toast({ title: "Order created successfully" });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          setLocation(`/orders/${data.id}`);
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create order" });
        },
      }
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">New Work Order</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Work Order Sheet Paper */}
          <div className="bg-white border border-gray-300 shadow-md p-8 font-serif">
            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold underline">
                {form.watch("orderType") === "Sample" ? "Sample" : "Bulk"} Dyeing Work Order Sheet
              </h2>
            </div>

            {/* Order No & Date */}
            <div className="mb-4 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold w-24">Order No:</span>
                <FormField
                  control={form.control}
                  name="orderNo"
                  render={({ field }) => (
                    <FormItem className="flex-1 m-0">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Jist-0375/06/2026 (auto if blank)"
                          className="border-0 border-b border-gray-400 rounded-none px-1 h-7 text-sm focus-visible:ring-0 font-serif"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold w-24">Date</span>
                <span className="mr-2">:</span>
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="m-0">
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="border-0 border-b border-gray-400 rounded-none px-1 h-7 text-sm focus-visible:ring-0 font-serif w-44"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("date") && (
                  <span className="text-gray-500 text-sm">{formatDate(form.watch("date"))}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold w-24">Order Type</span>
                <span className="mr-2">:</span>
                <FormField
                  control={form.control}
                  name="orderType"
                  render={({ field }) => (
                    <FormItem className="m-0">
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-0 border-b border-gray-400 rounded-none h-7 text-sm focus:ring-0 w-36 font-serif">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Sample">Sample</SelectItem>
                          <SelectItem value="Bulk">Bulk</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* To Section */}
            <div className="mb-5 text-sm space-y-1">
              <p className="font-bold">To</p>
              <FormField
                control={form.control}
                name="buyerName"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Buyer / Company Name *"
                        className="border-0 border-b border-gray-400 rounded-none px-1 h-7 text-sm focus-visible:ring-0 font-serif font-semibold"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="buyerAddress"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Address"
                        className="border-0 border-b border-gray-400 rounded-none px-1 h-7 text-sm focus-visible:ring-0 font-serif"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-2">
                <span className="font-bold">Attn:</span>
                <FormField
                  control={form.control}
                  name="attn"
                  render={({ field }) => (
                    <FormItem className="flex-1 m-0">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Attention person"
                          className="border-0 border-b border-gray-400 rounded-none px-1 h-7 text-sm focus-visible:ring-0 font-serif"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">From:</span>
                <FormField
                  control={form.control}
                  name="from"
                  render={({ field }) => (
                    <FormItem className="flex-1 m-0">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Sender name"
                          className="border-0 border-b border-gray-400 rounded-none px-1 h-7 text-sm focus-visible:ring-0 font-serif"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Color Table */}
            <table className="w-full border-collapse border border-gray-800 text-sm mb-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-800 px-2 py-2 text-center font-bold w-14">Sl. No.</th>
                  <th className="border border-gray-800 px-2 py-2 text-center font-bold">Color Name</th>
                  <th className="border border-gray-800 px-2 py-2 text-center font-bold w-36">Color Approval Swatch</th>
                  <th className="border border-gray-800 px-2 py-2 text-center font-bold w-28">Qty. in Kg.</th>
                  <th className="border border-gray-800 px-2 py-2 text-center font-bold w-48">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="align-top">
                    <td className="border border-gray-800 px-2 py-3 text-center font-bold">{index + 1}</td>
                    <td className="border border-gray-800 px-2 py-2">
                      <FormField
                        control={form.control}
                        name={`colorRows.${index}.colorName`}
                        render={({ field }) => (
                          <FormItem className="m-0">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. Dev 1364 (As Per Sample) 150/D-F-0"
                                className="border-0 rounded-none px-0 h-7 text-sm focus-visible:ring-0 font-serif"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="border border-gray-800 px-2 py-2 text-center">
                      <FormField
                        control={form.control}
                        name={`colorRows.${index}.colorApproval`}
                        render={({ field }) => (
                          <FormItem className="m-0">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="S/OK"
                                className="border-0 rounded-none px-0 h-7 text-sm focus-visible:ring-0 font-serif text-center"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="border border-gray-800 px-2 py-2 text-center">
                      <FormField
                        control={form.control}
                        name={`colorRows.${index}.qtyKg`}
                        render={({ field }) => (
                          <FormItem className="m-0">
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="border-0 rounded-none px-0 h-7 text-sm focus-visible:ring-0 font-serif text-center"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="border border-gray-800 px-2 py-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold shrink-0">Factory:</span>
                          <FormField
                            control={form.control}
                            name={`colorRows.${index}.factory`}
                            render={({ field }) => (
                              <FormItem className="flex-1 m-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g. E"
                                    className="border-0 border-b border-gray-400 rounded-none px-1 h-5 text-xs focus-visible:ring-0 font-serif"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold shrink-0">Job:</span>
                          <FormField
                            control={form.control}
                            name={`colorRows.${index}.jobNo`}
                            render={({ field }) => (
                              <FormItem className="flex-1 m-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g. Jist-5132"
                                    className="border-0 border-b border-gray-400 rounded-none px-1 h-5 text-xs focus-visible:ring-0 font-serif"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold shrink-0">Unit:</span>
                          <FormField
                            control={form.control}
                            name={`colorRows.${index}.unit`}
                            render={({ field }) => (
                              <FormItem className="flex-1 m-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g. Drawstring"
                                    className="border-0 border-b border-gray-400 rounded-none px-1 h-5 text-xs focus-visible:ring-0 font-serif"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="mt-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-50">
                  <td colSpan={3} className="border border-gray-800 px-2 py-2 text-center font-bold">
                    Total Qty
                  </td>
                  <td className="border border-gray-800 px-2 py-2 text-center font-bold">
                    {totalQty > 0 ? `${totalQty.toFixed(2)} Kg` : "—"}
                  </td>
                  <td className="border border-gray-800 px-2 py-2" />
                </tr>
              </tbody>
            </table>

            {/* Add Row Button */}
            <button
              type="button"
              onClick={() =>
                append({ colorName: "", colorApproval: "S/OK", qtyKg: 0, factory: "", jobNo: "", unit: "" })
              }
              className="mt-2 flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm"
            >
              <Plus className="h-4 w-4" /> Add Color Row
            </button>

            {/* Extra Fields */}
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm border-t pt-4">
              <div className="flex items-center gap-2">
                <span className="font-bold shrink-0">Yarn Type:</span>
                <FormField
                  control={form.control}
                  name="yarnType"
                  render={({ field }) => (
                    <FormItem className="flex-1 m-0">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. 100% Cotton 30/1"
                          className="border-0 border-b border-gray-400 rounded-none px-1 h-7 text-sm focus-visible:ring-0 font-serif"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold shrink-0">Factory:</span>
                <FormField
                  control={form.control}
                  name="factoryId"
                  render={({ field }) => (
                    <FormItem className="flex-1 m-0">
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="border-0 border-b border-gray-400 rounded-none h-7 text-sm focus:ring-0 font-serif">
                            <SelectValue placeholder="Select factory" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {factories?.map((f: any) => (
                            <SelectItem key={f.id} value={f.id.toString()}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold shrink-0">Delivery Date:</span>
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem className="m-0">
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="border-0 border-b border-gray-400 rounded-none px-1 h-7 text-sm focus-visible:ring-0 font-serif w-44"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => setLocation("/orders")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOrder.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {createOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Order
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
