import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateOrder, useListFactories, getListOrdersQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

const formSchema = z.object({
  orderNo: z.string().min(1, "Required"),
  buyerName: z.string().min(1, "Required"),
  factoryId: z.coerce.number().min(1, "Required"),
  orderType: z.enum(["Sample", "Bulk"]),
  yarnType: z.string().min(1, "Required"),
  color: z.string().min(1, "Required"),
  quantityKg: z.coerce.number().min(0.1, "Must be > 0"),
  receiveDate: z.string().min(1, "Required"),
  deliveryDate: z.string().min(1, "Required"),
  remarks: z.string().optional(),
});

export default function NewOrderPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: factories } = useListFactories();
  const createOrder = useCreateOrder();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderType: "Bulk",
      receiveDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createOrder.mutate({ data: values as any }, {
      onSuccess: (data) => {
        toast({ title: "Order created successfully" });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        setLocation(`/orders/${data.id}`);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create order" });
      }
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">New Order</h1>
          <p className="text-gray-500 mt-1">Create a new yarn dyeing order.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="orderNo" render={({ field }) => (
                  <FormItem><FormLabel>Order No *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="buyerName" render={({ field }) => (
                  <FormItem><FormLabel>Buyer Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="factoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factory *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select Factory" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {factories?.map((f: any) => <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="orderType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Bulk">Bulk</SelectItem>
                        <SelectItem value="Sample">Sample</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="yarnType" render={({ field }) => (
                  <FormItem><FormLabel>Yarn Type *</FormLabel><FormControl><Input {...field} placeholder="e.g. 100% Cotton 30/1" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="color" render={({ field }) => (
                  <FormItem><FormLabel>Color *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="quantityKg" render={({ field }) => (
                  <FormItem><FormLabel>Quantity (KG) *</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="receiveDate" render={({ field }) => (
                  <FormItem><FormLabel>Receive Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                  <FormItem><FormLabel>Delivery Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="remarks" render={({ field }) => (
                <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} className="h-24" /></FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation("/orders")}>Cancel</Button>
                <Button type="submit" disabled={createOrder.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {createOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Order
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}