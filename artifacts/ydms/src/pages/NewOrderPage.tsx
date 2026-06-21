import { useLocation } from "wouter";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateYarnDyeingOrder, useListFactories, useListYarnTypes, useListRawMaterials, getListYarnDyeingOrdersQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Plus, Trash2, ScanLine, AlertTriangle } from "lucide-react";
import { ScanOrderSheet, type ScannedOrderData } from "@/components/ScanOrderSheet";

const colorRowSchema = z.object({
  yarnCount: z.string().optional(),
  colorName: z.string().min(1, "Required"),
  colorRef: z.string().optional(),
  qtyKg: z.coerce.number().min(0.01, "Must be > 0"),
});

const formSchema = z.object({
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

type FormValues = z.infer<typeof formSchema>;

export default function NewOrderPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: factories } = useListFactories();
  const { data: yarnTypes = [] } = useListYarnTypes();
  const { data: rawMaterialsData, isLoading: rawMaterialsLoading } = useListRawMaterials();
  const createOrder = useCreateYarnDyeingOrder();
  const [selectedYarnTypeName, setSelectedYarnTypeName] = useState<string | null>(null);
  const [selectedProcessLossBulk, setSelectedProcessLossBulk] = useState<number | null>(null);
  const [selectedProcessLossSample, setSelectedProcessLossSample] = useState<number | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [scanWarning, setScanWarning] = useState<string | null>(null);

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
      orderNo: "",
      orderType: "Sample",
      date: new Date().toISOString().split("T")[0],
      deliveryDate: "",
      yarnType: "",
      customerGarmentsName: "",
      jobNo: "",
      unit: "",
      buyerName: "",
      buyerAddress: "",
      attn: "",
      from: "",
      colorRows: [{ yarnCount: "", colorName: "", colorRef: "", qtyKg: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "colorRows" });

  const watchedRows = form.watch("colorRows");
  const watchedOrderType = form.watch("orderType");
  const totalQty = watchedRows.reduce((sum, r) => sum + (Number(r.qtyKg) || 0), 0);

  const activeProcessLoss: number | null =
    watchedOrderType === "Bulk" ? selectedProcessLossBulk : selectedProcessLossSample;
  const processLossAmt = activeProcessLoss != null ? (totalQty * activeProcessLoss) / 100 : null;
  const grandTotal = processLossAmt != null ? totalQty + processLossAmt : null;

  function handleScanData(data: ScannedOrderData) {
    setScanWarning(null);
    if (data.orderNo) form.setValue("orderNo", data.orderNo);
    if (data.orderType) form.setValue("orderType", data.orderType);
    if (data.date) form.setValue("date", data.date);
    if (data.jobNo) form.setValue("jobNo", data.jobNo);
    if (data.unit) form.setValue("unit", data.unit);

    if (data.factoryName && factories) {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matched = (factories as any[]).find(
        (f) => normalize(f.name ?? "").includes(normalize(data.factoryName!)) ||
               normalize(data.factoryName!).includes(normalize(f.name ?? ""))
      );
      if (matched) {
        handleFactoryChange(matched.id.toString());
      } else {
        setScanWarning(`"${data.factoryName}" এই factory টি system-এ নেই। আগে Factory list-এ add করুন।`);
      }
    }

    if (data.colorRows.length > 0) {
      const existing = form.getValues("colorRows");
      const isEmpty = existing.length === 1 && !existing[0].colorName && !existing[0].qtyKg;
      const newRows = data.colorRows.map((r) => ({
        yarnCount: r.yarnCount || "",
        colorName: r.colorName,
        colorRef: r.colorRef || "",
        qtyKg: r.qtyKg || 0,
      }));
      if (isEmpty) {
        form.setValue("colorRows", newRows);
      } else {
        form.setValue("colorRows", [...existing, ...newRows]);
      }
    }

    toast({
      title: "Scan সফল হয়েছে!",
      description: `${data.colorRows.length} টি color row fill হয়েছে। বাকি field গুলো check করুন।`,
    });
  }

  function handleFactoryChange(factoryId: string) {
    const selected = factories?.find((f: any) => f.id.toString() === factoryId);
    if (selected) {
      form.setValue("factoryId", Number(factoryId));
      form.setValue("buyerName", selected.name ?? "");
      form.setValue("buyerAddress", selected.address ?? "");
      form.setValue("attn", selected.contactPerson ?? "");
      form.setValue("from", (selected as any).location ?? "");
      // look up yarn type name from yarn_types using factory's yarn_type_id
      const yarnTypeId = (selected as any).yarnTypeId;
      const matchedYarnType = (yarnTypes as any[]).find((y: any) => y.id === yarnTypeId);
      setSelectedYarnTypeName(matchedYarnType?.name ?? null);
      // store process loss values from selected factory
      setSelectedProcessLossBulk(selected.processLossBulk != null ? Number(selected.processLossBulk) : null);
      setSelectedProcessLossSample(selected.processLossSample != null ? Number(selected.processLossSample) : null);
      // reset all yarnCount selections when factory changes
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
    const remarks = [values.customerGarmentsName, values.jobNo, values.unit].filter(Boolean).join(" | ");

    createOrder.mutate(
      {
        data: {
          orderNo: values.orderNo || undefined,
          orderType: values.orderType,
          receiveDate: values.date,
          deliveryDate: values.deliveryDate || undefined,
          customerGarmentsName: values.customerGarmentsName || undefined,
          jobNo: values.jobNo || undefined,
          unit: values.unit || undefined,
          factoryId: values.factoryId,
          buyerName: values.buyerName || undefined,
          buyerAddress: values.buyerAddress || undefined,
          attn: values.attn || undefined,
          fromPerson: values.from || undefined,
          processLossPct: activeProcessLoss ?? undefined,
          processLossKg: processLossAmt ?? undefined,
          grandTotalKg: grandTotal ?? undefined,
          colorRows: values.colorRows.map((r) => ({
            yarnCount: r.yarnCount || undefined,
            colorName: r.colorName,
            colorRef: r.colorRef || undefined,
            qtyKg: r.qtyKg,
            remarks: remarks || undefined,
          })),
        },
      },
      {
        onSuccess: (data) => {
          toast({ title: "Order created successfully" });
          queryClient.invalidateQueries({ queryKey: getListYarnDyeingOrdersQueryKey() });
          setLocation(`/orders`);
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create order" });
        },
      }
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setLocation("/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">New Work Order</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          onClick={() => setShowScan(true)}
        >
          <ScanLine className="h-4 w-4" />
          Order Sheet Scan
        </Button>
      </div>

      {scanWarning && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">Factory পাওয়া যায়নি</p>
            <p className="mt-0.5 text-amber-700">{scanWarning}</p>
          </div>
          <button onClick={() => setScanWarning(null)} className="ml-auto text-amber-500 hover:text-amber-700">✕</button>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {/* Order Info + Buyer — single compact card */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormField control={form.control} name="orderNo" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Order No</FormLabel>
                    <FormControl><Input {...field} placeholder="Auto-generated" className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="orderType" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Order Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Sample">Sample</SelectItem>
                        <SelectItem value="Bulk">Bulk</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Date *</FormLabel>
                    <FormControl><Input type="date" {...field} className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Delivery Date</FormLabel>
                    <FormControl><Input type="date" {...field} className="h-8 text-sm" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
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
                  <FormField control={form.control} name="factoryId" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-medium text-gray-600">Dyeing Factory *</FormLabel>
                      <Select onValueChange={handleFactoryChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select factory…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {factories?.map((f: any) => (
                            <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="attn" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-medium text-gray-600">Contact Person</FormLabel>
                      <FormControl><Input {...field} readOnly placeholder="e.g. Mr. Arif Sab" className="h-9 text-sm bg-gray-50 cursor-not-allowed" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="from" render={({ field }) => (
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

          {/* Color Rows */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Color Details</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-1.5 px-2 font-medium text-gray-500 w-7">#</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-500 w-36">Yarn Count</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-500">Color Name / Pantone Name</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-500 w-32">Color Ref / Swatch</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-500 w-20">Qty (Kg)</th>
                      <th className="text-left py-1.5 px-2 font-medium text-gray-500">Remarks</th>
                      <th className="w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const remarks = [
                        form.watch("customerGarmentsName"),
                        form.watch("jobNo"),
                        form.watch("unit"),
                      ].filter(Boolean).join(" | ");
                      return (
                        <tr key={field.id} className="border-b last:border-0">
                          <td className="py-1 px-2 text-gray-400 font-medium">{index + 1}</td>
                          <td className="py-1 px-1">
                            <FormField control={form.control} name={`colorRows.${index}.yarnCount`} render={({ field }) => (
                              <FormItem className="m-0">
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                  disabled={!selectedYarnTypeName}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue placeholder={
                                        !selectedYarnTypeName
                                          ? "Select factory first"
                                          : rawMaterialsLoading
                                          ? "Loading..."
                                          : filteredYarnCounts.length
                                          ? "Select…"
                                          : "No data"
                                      } />
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
                                <FormControl><Input {...field} placeholder="e.g. Red / Pantone 485C" className="h-7 text-xs" /></FormControl>
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
                          <td className="py-1 px-2">
                            <span className="text-xs text-gray-500 bg-gray-50 rounded px-1.5 py-1 block min-w-[120px]">
                              {remarks || <span className="text-gray-300 italic">auto-filled</span>}
                            </span>
                          </td>
                          <td className="py-1 px-1">
                            {fields.length > 1 && (
                              <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-gray-50">
                      <td colSpan={4} className="py-1.5 px-2 font-semibold text-right text-xs">Total Qty</td>
                      <td className="py-1.5 px-2 font-semibold text-xs">{totalQty > 0 ? `${totalQty.toFixed(2)} Kg` : "—"}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <button
                type="button"
                onClick={() => append({ yarnCount: "", colorName: "", colorRef: "", qtyKg: 0 })}
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
            <Button type="button" variant="outline" size="sm" onClick={() => setLocation("/orders")}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createOrder.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {createOrder.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Create Order
            </Button>
          </div>
        </form>
      </Form>

      <ScanOrderSheet
        open={showScan}
        onClose={() => setShowScan(false)}
        onData={handleScanData}
      />
    </div>
  );
}
