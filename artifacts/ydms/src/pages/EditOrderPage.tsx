import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetYarnDyeingOrder, useUpdateYarnDyeingOrder, useListFactories, useListYarnTypes,
  useListRawMaterials, getGetYarnDyeingOrderQueryKey, getListYarnDyeingOrdersQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";

const colorRowSchema = z.object({
  yarnCount: z.string().optional(),
  colorName: z.string().min(1, "Required"),
  colorRef: z.string().optional(),
  qtyKg: z.coerce.number().min(0.01, "Must be > 0"),
  remarks: z.string().optional(),
});

const formSchema = z.object({
  orderType: z.enum(["Sample", "Bulk"]),
  date: z.string().min(1, "Required"),
  deliveryDate: z.string().optional(),
  factoryId: z.coerce.number().optional(),
  buyerName: z.string().min(1, "Required"),
  buyerAddress: z.string().optional(),
  attn: z.string().optional(),
  fromPerson: z.string().optional(),
  yarnType: z.string().optional(),
  customerGarmentsName: z.string().optional(),
  jobNo: z.string().optional(),
  unit: z.string().optional(),
  remarks: z.string().optional(),
  colorRows: z.array(colorRowSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditOrderPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: order, isLoading: orderLoading } = useGetYarnDyeingOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetYarnDyeingOrderQueryKey(orderId) }
  });
  const { data: factories } = useListFactories();
  const { data: yarnTypes = [], isSuccess: yarnTypesLoaded } = useListYarnTypes();
  const { data: rawMaterialsData } = useListRawMaterials();
  const updateOrder = useUpdateYarnDyeingOrder();

  const [selectedYarnTypeName, setSelectedYarnTypeName] = useState<string | null>(null);
  const [selectedProcessLossBulk, setSelectedProcessLossBulk] = useState<number | null>(null);
  const [selectedProcessLossSample, setSelectedProcessLossSample] = useState<number | null>(null);
  const initializedForOrderRef = useRef<number | null>(null);
  const prevColorRowsLengthRef = useRef<number>(0);

  const rawMaterials: any[] = Array.isArray(rawMaterialsData) ? rawMaterialsData : [];

  const filteredYarnCounts: string[] = selectedYarnTypeName
    ? rawMaterials
        .filter((rm) => rm.yarnType === selectedYarnTypeName)
        .map((rm) => rm.yarnCount)
        .filter((v): v is string => Boolean(v))
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort()
    : [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderType: "Sample",
      date: new Date().toISOString().split("T")[0],
      deliveryDate: "",
      yarnType: "",
      fromPerson: "",
      customerGarmentsName: "",
      jobNo: "",
      unit: "",
      buyerName: "",
      buyerAddress: "",
      attn: "",
      remarks: "",
      colorRows: [{ yarnCount: "", colorName: "", colorRef: "", qtyKg: 0, remarks: "" }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "colorRows" });
  const watchedRows = form.watch("colorRows");
  const watchedOrderType = form.watch("orderType");
  const watchedFactoryId = form.watch("factoryId");
  const totalQty = watchedRows.reduce((sum, r) => sum + (Number(r.qtyKg) || 0), 0);
  const activeProcessLoss: number | null =
    watchedOrderType === "Bulk" ? selectedProcessLossBulk : selectedProcessLossSample;
  const processLossAmt = activeProcessLoss != null ? (totalQty * activeProcessLoss) / 100 : null;
  const grandTotal = processLossAmt != null ? totalQty + processLossAmt : null;

  useEffect(() => {
    if (!order) return;
    if (!(factories as any[])?.length) return;
    if (!yarnTypesLoaded) return;
    if (initializedForOrderRef.current === orderId) return;
    initializedForOrderRef.current = orderId;

    const colorRowsData = (order as any).colorRows;
    const rows = colorRowsData?.length
      ? colorRowsData.map((r: any) => ({
          yarnCount: r.yarnCount ?? "",
          colorName: r.colorName ?? "",
          colorRef: r.colorRef ?? "",
          qtyKg: Number(r.qtyKg) || 0,
          remarks: r.remarks ?? "",
        }))
      : [{ yarnCount: "", colorName: "", colorRef: "", qtyKg: 0, remarks: "" }];

    form.setValue("orderType", (order.orderType as "Sample" | "Bulk") ?? "Sample");
    form.setValue("date", order.receiveDate ?? new Date().toISOString().split("T")[0]);
    form.setValue("deliveryDate", order.deliveryDate ?? "");
    form.setValue("factoryId", order.factoryId ?? undefined);
    form.setValue("buyerName", order.buyerName ?? "");
    form.setValue("buyerAddress", (order as any).buyerAddress ?? "");
    form.setValue("attn", (order as any).attn ?? "");
    form.setValue("fromPerson", (order as any).fromPerson ?? "");
    form.setValue("customerGarmentsName", order.customerGarmentsName ?? "");
    form.setValue("jobNo", order.jobNo ?? "");
    form.setValue("unit", order.unit ?? "");
    form.setValue("yarnType", order.yarnType ?? "");
    form.setValue("remarks", order.remarks ?? "");
    replace(rows);

    if (order.factoryId) {
      const factory = (factories as any[])?.find((f: any) => f.id === order.factoryId);
      if (factory) {
        const yarnTypeId = factory.yarnTypeId;
        const matchedYarnType = (yarnTypes as any[]).find((y: any) => y.id === yarnTypeId);
        setSelectedYarnTypeName(matchedYarnType?.name ?? null);
        setSelectedProcessLossBulk(factory.processLossBulk != null ? Number(factory.processLossBulk) : null);
        setSelectedProcessLossSample(factory.processLossSample != null ? Number(factory.processLossSample) : null);
      }
    }
  }, [order, factories, yarnTypes, yarnTypesLoaded, orderId]);

  useEffect(() => {
    if (fields.length <= prevColorRowsLengthRef.current) {
      prevColorRowsLengthRef.current = fields.length;
      return;
    }
    prevColorRowsLengthRef.current = fields.length;

    const rows = document.querySelectorAll("[data-color-row]");
    const lastRow = rows[rows.length - 1] as HTMLElement | undefined;
    if (!lastRow) return;

    const yarnTrigger = lastRow.querySelector<HTMLButtonElement>(
      'button[role="combobox"]:not([disabled])'
    );
    if (yarnTrigger) {
      yarnTrigger.focus();
    } else {
      lastRow.querySelector<HTMLInputElement>("input")?.focus();
    }
  }, [fields.length]);

  function handleFactoryChange(factoryId: string) {
    const selected = (factories as any[])?.find((f: any) => f.id.toString() === factoryId);
    if (selected) {
      form.setValue("factoryId", Number(factoryId));
      form.setValue("buyerName", selected.name ?? "");
      form.setValue("buyerAddress", selected.address ?? "");
      form.setValue("attn", selected.contactPerson ?? "");
      form.setValue("fromPerson", (selected as any).location ?? "");
      const yarnTypeId = selected.yarnTypeId;
      const matchedYarnType = (yarnTypes as any[]).find((y: any) => y.id === yarnTypeId);
      setSelectedYarnTypeName(matchedYarnType?.name ?? null);
      form.setValue("yarnType", matchedYarnType?.name ?? "");
      setSelectedProcessLossBulk(selected.processLossBulk != null ? Number(selected.processLossBulk) : null);
      setSelectedProcessLossSample(selected.processLossSample != null ? Number(selected.processLossSample) : null);
      form.getValues("colorRows").forEach((_, i) => {
        form.setValue(`colorRows.${i}.yarnCount`, "");
      });
    } else {
      setSelectedYarnTypeName(null);
      setSelectedProcessLossBulk(null);
      setSelectedProcessLossSample(null);
    }
  }

  function onSubmit(values: FormValues) {
    updateOrder.mutate(
      {
        id: orderId,
        data: {
          orderType: values.orderType,
          buyerName: values.buyerName,
          buyerAddress: values.buyerAddress || undefined,
          attn: values.attn || undefined,
          fromPerson: values.fromPerson || undefined,
          customerGarmentsName: values.customerGarmentsName || undefined,
          jobNo: values.jobNo || undefined,
          unit: values.unit || undefined,
          factoryId: values.factoryId ?? null,
          yarnType: values.yarnType || undefined,
          receiveDate: values.date,
          deliveryDate: values.deliveryDate || undefined,
          remarks: values.remarks || undefined,
          processLossPct: activeProcessLoss ?? undefined,
          processLossKg: processLossAmt ?? undefined,
          grandTotalKg: grandTotal ?? undefined,
          colorRows: values.colorRows as any,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Order updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetYarnDyeingOrderQueryKey(orderId) });
          queryClient.invalidateQueries({ queryKey: getListYarnDyeingOrdersQueryKey() });
          setLocation(`/orders/${orderId}`);
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to update order" });
        },
      }
    );
  }

  if (orderLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!order) return <div className="p-8 text-center text-gray-500">Order not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-3 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setLocation(`/orders/${orderId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">Edit Order — {order.orderNo}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-gray-700">Order Info</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormField control={form.control} name="orderType" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Order Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Sample">Sample</SelectItem>
                        <SelectItem value="Bulk">Bulk</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Receive Date</FormLabel>
                    <FormControl><Input {...field} type="date" className="h-8 text-xs" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Delivery Date</FormLabel>
                    <FormControl><Input {...field} type="date" className="h-8 text-xs" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormField control={form.control} name="customerGarmentsName" render={({ field }) => (
                  <FormItem className="space-y-1 col-span-2">
                    <FormLabel className="text-xs">Customer/Garments Name</FormLabel>
                    <FormControl><Input {...field} className="h-8 text-sm" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="jobNo" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Job No</FormLabel>
                    <FormControl><Input {...field} className="h-8 text-sm" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Unit</FormLabel>
                    <FormControl><Input {...field} className="h-8 text-sm" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Dyeing Factory *</label>
                    <Select onValueChange={handleFactoryChange} value={watchedFactoryId?.toString() ?? ""}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select factory…" /></SelectTrigger>
                      <SelectContent>
                        {(factories as any[] ?? []).map((f: any) => (
                          <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormField control={form.control} name="attn" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-medium text-gray-600">Contact Person</FormLabel>
                      <FormControl><Input {...field} readOnly placeholder="e.g. Mr. Arif Sab" className="h-9 text-sm bg-gray-50 cursor-not-allowed" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fromPerson" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-medium text-gray-600">Sender Person</FormLabel>
                      <FormControl><Input {...field} readOnly placeholder="e.g. Md Masud Ibna Zahid" className="h-9 text-sm bg-gray-50 cursor-not-allowed" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="buyerAddress" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-600">Address</FormLabel>
                    <FormControl><Input {...field} readOnly placeholder="Full address…" className="h-9 text-sm bg-gray-50 cursor-not-allowed" /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-gray-700">Color Details</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500">
                      <th className="py-1.5 px-2 text-left w-8">#</th>
                      <th className="py-1.5 px-1 text-left w-32">Yarn Count</th>
                      <th className="py-1.5 px-1 text-left">Color Name</th>
                      <th className="py-1.5 px-1 text-left w-28">Color Ref</th>
                      <th className="py-1.5 px-1 text-left w-24">Qty (Kg)</th>
                      <th className="py-1.5 px-1 text-left">Remarks</th>
                      <th className="py-1.5 px-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} data-color-row className="border-b last:border-0">
                        <td className="py-1 px-2 text-gray-400 font-medium">{index + 1}</td>
                        <td className="py-1 px-1">
                          <FormField control={form.control} name={`colorRows.${index}.yarnCount`} render={({ field }) => (
                            <FormItem className="m-0">
                              <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!selectedYarnTypeName}>
                                <FormControl>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder={!selectedYarnTypeName ? "Select factory first" : "Select…"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {filteredYarnCounts.map((yc: string) => (
                                    <SelectItem key={yc} value={yc}>{yc}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-1 px-1">
                          <FormField control={form.control} name={`colorRows.${index}.colorName`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} placeholder="Color name" className="h-7 text-xs" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-1 px-1">
                          <FormField control={form.control} name={`colorRows.${index}.colorRef`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} placeholder="e.g. S/OK" className="h-7 text-xs" /></FormControl>
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-1 px-1">
                          <FormField control={form.control} name={`colorRows.${index}.qtyKg`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} type="number" step="0.01" placeholder="0.00" className="h-7 text-xs" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-1 px-1">
                          <FormField control={form.control} name={`colorRows.${index}.remarks`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} placeholder="Remarks" className="h-7 text-xs" /></FormControl>
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-1 px-1">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-gray-50">
                      <td colSpan={4} className="py-1.5 px-2 font-semibold text-right text-xs">Total Qty</td>
                      <td colSpan={2} className="py-1.5 px-2 font-semibold text-xs">{totalQty > 0 ? `${totalQty.toFixed(2)} Kg` : "—"}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <button
                type="button"
                onClick={() => {
                  const firstRowRemarks = form.getValues("colorRows")[0]?.remarks ?? "";
                  append({ yarnCount: "", colorName: "", colorRef: "", qtyKg: 0, remarks: firstRowRemarks });
                }}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="h-3.5 w-3.5" /> Add Color Row
              </button>

              <div className="mt-4 border rounded-md divide-y bg-gray-50 text-xs">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-gray-600 font-medium">Actual Dye Yarn Qty</span>
                  <span className="font-semibold text-gray-800">
                    {totalQty > 0 ? `${totalQty.toFixed(2)} Kg` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-gray-600 font-medium">
                    Dyeing Process Loss %
                    {activeProcessLoss != null && (
                      <span className="ml-1.5 text-indigo-500">({activeProcessLoss}% — {watchedOrderType})</span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {processLossAmt != null
                      ? `${processLossAmt.toFixed(2)} Kg`
                      : activeProcessLoss == null
                      ? <span className="text-gray-400 italic">Select factory &amp; order type</span>
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 rounded-b-md">
                  <span className="text-indigo-700 font-semibold">Grand Total</span>
                  <span className="font-bold text-indigo-700">
                    {grandTotal != null ? `${grandTotal.toFixed(2)} Kg` : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setLocation(`/orders/${orderId}`)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updateOrder.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {updateOrder.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
