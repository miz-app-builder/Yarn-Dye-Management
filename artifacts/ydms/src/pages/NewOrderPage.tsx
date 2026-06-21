import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateOrder, useListFactories, getListOrdersQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
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
  factoryId: z.coerce.number({ required_error: "Required" }).min(1, "Required"),
  buyerName: z.string().min(1, "Required"),
  buyerAddress: z.string().optional(),
  attn: z.string().optional(),
  from: z.string().optional(),
  yarnType: z.string().optional(),
  deliveryDate: z.string().optional(),
  colorRows: z.array(colorRowSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewOrderPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: factories } = useListFactories();
  const createOrder = useCreateOrder();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderNo: "",
      orderType: "Sample",
      date: new Date().toISOString().split("T")[0],
      deliveryDate: "",
      yarnType: "",
      buyerName: "",
      buyerAddress: "",
      attn: "",
      from: "",
      colorRows: [{ colorName: "", colorApproval: "S/OK", qtyKg: 0, factory: "", jobNo: "", unit: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "colorRows" });

  const watchedRows = form.watch("colorRows");
  const totalQty = watchedRows.reduce((sum, r) => sum + (Number(r.qtyKg) || 0), 0);

  function handleFactoryChange(factoryId: string) {
    const selected = factories?.find((f: any) => f.id.toString() === factoryId);
    if (selected) {
      form.setValue("factoryId", Number(factoryId));
      form.setValue("buyerName", selected.name ?? "");
      form.setValue("buyerAddress", selected.address ?? "");
      form.setValue("attn", selected.contactPerson ?? "");
    }
  }

  function onSubmit(values: FormValues) {
    const firstRow = values.colorRows[0];
    const remarksParts: string[] = [];
    if (firstRow.factory) remarksParts.push(`Factory: ${firstRow.factory}`);
    if (firstRow.jobNo) remarksParts.push(`Job: ${firstRow.jobNo}`);
    if (firstRow.unit) remarksParts.push(`Unit: ${firstRow.unit}`);

    const extraRows = values.colorRows.slice(1).map((r, i) => {
      const parts: string[] = [];
      if (r.factory) parts.push(`Factory: ${r.factory}`);
      if (r.jobNo) parts.push(`Job: ${r.jobNo}`);
      if (r.unit) parts.push(`Unit: ${r.unit}`);
      return `Row ${i + 2}: ${r.colorName} | ${r.colorApproval} | ${r.qtyKg} Kg | ${parts.join(", ")}`;
    });

    createOrder.mutate(
      {
        data: {
          orderNo: values.orderNo || undefined,
          orderType: values.orderType,
          buyerName: values.buyerName,
          factoryId: values.factoryId,
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
            ...remarksParts,
            ...extraRows,
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
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">New Work Order</h1>
          <p className="text-gray-500 mt-1">Create a new yarn dyeing work order.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Info + Buyer */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="orderNo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order No</FormLabel>
                    <FormControl><Input {...field} placeholder="Auto-generated if blank" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="orderType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Sample">Sample</SelectItem>
                        <SelectItem value="Bulk">Bulk</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="yarnType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yarn Type</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. 100% Cotton 30/1" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="border-t pt-6 space-y-4">
                <h2 className="font-semibold text-gray-700">Buyer / Factory</h2>
                <FormField control={form.control} name="factoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factory *</FormLabel>
                    <Select onValueChange={handleFactoryChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select factory (auto-fills buyer info)" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="buyerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer Name *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="buyerAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="attn" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attn</FormLabel>
                      <FormControl><Input {...field} placeholder="Contact person" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="from" render={({ field }) => (
                    <FormItem>
                      <FormLabel>From</FormLabel>
                      <FormControl><Input {...field} placeholder="Sender name" /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color Rows */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="font-semibold text-gray-700">Color Details</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-gray-600 w-8">#</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Color Name</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 w-32">Approval Swatch</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 w-24">Qty (Kg)</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 w-24">Factory</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 w-28">Job No</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 w-28">Unit</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b last:border-0">
                        <td className="py-2 px-2 text-gray-400 font-medium">{index + 1}</td>
                        <td className="py-2 px-2">
                          <FormField control={form.control} name={`colorRows.${index}.colorName`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} placeholder="Color name" className="h-8" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-2 px-2">
                          <FormField control={form.control} name={`colorRows.${index}.colorApproval`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} placeholder="S/OK" className="h-8" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-2 px-2">
                          <FormField control={form.control} name={`colorRows.${index}.qtyKg`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} type="number" step="0.01" placeholder="0.00" className="h-8" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-2 px-2">
                          <FormField control={form.control} name={`colorRows.${index}.factory`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} placeholder="e.g. E" className="h-8" /></FormControl>
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-2 px-2">
                          <FormField control={form.control} name={`colorRows.${index}.jobNo`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} placeholder="e.g. Jist-5132" className="h-8" /></FormControl>
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-2 px-2">
                          <FormField control={form.control} name={`colorRows.${index}.unit`} render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl><Input {...field} placeholder="e.g. Drawstring" className="h-8" /></FormControl>
                            </FormItem>
                          )} />
                        </td>
                        <td className="py-2 px-2">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-gray-50">
                      <td colSpan={3} className="py-2 px-2 font-semibold text-right text-sm">Total Qty</td>
                      <td className="py-2 px-2 font-semibold text-sm">{totalQty > 0 ? `${totalQty.toFixed(2)} Kg` : "—"}</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ colorName: "", colorApproval: "S/OK", qtyKg: 0, factory: "", jobNo: "", unit: "" })}
                className="gap-1"
              >
                <Plus className="h-4 w-4" /> Add Color Row
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation("/orders")}>Cancel</Button>
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
