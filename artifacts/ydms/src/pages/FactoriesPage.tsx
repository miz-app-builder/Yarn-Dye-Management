import { useState } from "react";
import { useListFactories, useCreateFactory, useUpdateFactory, useArchiveFactory, useListYarnTypes } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Archive } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Required"),
  location: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  yarnTypeId: z.coerce.number().optional(),
  dyeingPrice: z.string().optional(),
  processLossBulk: z.string().optional(),
  processLossSample: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const emptyValues: FormValues = {
  name: "", location: "", contactPerson: "", phone: "",
  email: "", address: "", dyeingPrice: "", processLossBulk: "", processLossSample: "",
};

export default function FactoriesPage() {
  const { data: factories, isLoading } = useListFactories();
  const { data: yarnTypes } = useListYarnTypes();
  const createFactory = useCreateFactory();
  const updateFactory = useUpdateFactory();
  const archiveFactory = useArchiveFactory();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: emptyValues });

  const openNew = () => {
    setEditingId(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  };

  const openEdit = (f: any) => {
    setEditingId(f.id);
    form.reset({
      name: f.name,
      location: f.location || "",
      contactPerson: f.contactPerson || "",
      phone: f.phone || "",
      email: f.email || "",
      address: f.address || "",
      yarnTypeId: f.yarnTypeId ?? undefined,
      dyeingPrice: f.dyeingPrice || "",
      processLossBulk: f.processLossBulk || "",
      processLossSample: f.processLossSample || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const payload: any = {
      name: values.name,
      location: values.location || undefined,
      contactPerson: values.contactPerson || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      yarnTypeId: values.yarnTypeId || undefined,
      dyeingPrice: values.dyeingPrice || undefined,
      processLossBulk: values.processLossBulk || undefined,
      processLossSample: values.processLossSample || undefined,
    };

    const action = editingId
      ? updateFactory.mutateAsync({ id: editingId, data: payload })
      : createFactory.mutateAsync({ data: payload });

    action
      .then(() => {
        toast({ title: editingId ? "Factory updated" : "Factory created" });
        queryClient.invalidateQueries({ queryKey: ["/api/factories"] });
        setDialogOpen(false);
      })
      .catch((err: any) =>
        toast({ variant: "destructive", title: "Error", description: err.message })
      );
  };

  const handleArchive = (id: number) => {
    if (confirm("Archive this factory?")) {
      archiveFactory.mutate(
        { id },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/factories"] }) }
      );
    }
  };

  const getYarnTypeName = (id: number | null | undefined) => {
    if (!id || !yarnTypes) return "—";
    const yt = (yarnTypes as any[]).find((y: any) => y.id === id);
    return yt ? yt.name : "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Factories</h1>
          <p className="text-gray-500 mt-1">Manage dyeing factory partners and their details.</p>
        </div>
        <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Factory
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Dyeing Factory Name</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Yarn Dyeing Type</TableHead>
              <TableHead>Dyeing Price</TableHead>
              <TableHead>Process Loss %</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : (factories as any[])?.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-sm text-gray-500">{f.factoryCode}</TableCell>
                <TableCell className="font-medium text-gray-900">{f.name}</TableCell>
                <TableCell>{f.location || "—"}</TableCell>
                <TableCell>{getYarnTypeName(f.yarnTypeId)}</TableCell>
                <TableCell>{f.dyeingPrice ? `৳${f.dyeingPrice}/kg` : "—"}</TableCell>
                <TableCell>
                  {f.processLossBulk || f.processLossSample ? (
                    <div className="text-sm">
                      {f.processLossBulk && <div>Bulk: {f.processLossBulk}%</div>}
                      {f.processLossSample && <div>Sample: {f.processLossSample}%</div>}
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{f.contactPerson || "—"}</div>
                    <div className="text-gray-400">{f.phone || ""}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={f.isActive !== false && f.status !== false ? "default" : "secondary"}
                    className={f.isActive !== false && f.status !== false ? "bg-green-100 text-green-800" : ""}
                  >
                    {f.isActive !== false && f.status !== false ? "Active" : "Archived"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>
                      <Edit className="w-4 h-4 text-gray-500" />
                    </Button>
                    {(f.isActive !== false && f.status !== false) && (
                      <Button variant="ghost" size="sm" onClick={() => handleArchive(f.id)}>
                        <Archive className="w-4 h-4 text-red-400 hover:text-red-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base">{editingId ? "Edit" : "Add"} Factory</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 py-1">

              {/* Row 1: Name (full width) */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-600">Dyeing Factory Name *</FormLabel>
                  <FormControl><Input {...field} placeholder="Enter factory name" className="h-8 text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Row 2: From + Yarn Dyeing Type */}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">From</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Narsingdi" className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="yarnTypeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Yarn Dyeing Type</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(yarnTypes as any[])?.map((yt: any) => (
                          <SelectItem key={yt.id} value={String(yt.id)}>{yt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Row 3: Dyeing Price + Process Loss Bulk + Sample */}
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="dyeingPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Dyeing Price (৳/kg)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="e.g. 45.00" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="processLossBulk" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Process Loss % (Bulk)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="e.g. 2.50" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="processLossSample" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Process Loss % (Sample)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="e.g. 3.00" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Row 4: Contact Person + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Contact Person</FormLabel>
                    <FormControl><Input {...field} className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Phone</FormLabel>
                    <FormControl><Input {...field} className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Row 5: Email + Address */}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Email</FormLabel>
                    <FormControl><Input type="email" {...field} className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Address</FormLabel>
                    <FormControl><Input {...field} className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={createFactory.isPending || updateFactory.isPending}
                  className="h-8 px-4 text-sm bg-indigo-600 hover:bg-indigo-700"
                >
                  {createFactory.isPending || updateFactory.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
