import { useState } from "react";
import { useListFactories, useCreateFactory, useUpdateFactory, useArchiveFactory } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Archive, Loader2 } from "lucide-react";

const formSchema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
});

export default function FactoriesPage() {
  const { data: factories, isLoading } = useListFactories();
  const createFactory = useCreateFactory();
  const updateFactory = useUpdateFactory();
  const archiveFactory = useArchiveFactory();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "", name: "", contactPerson: "", phone: "", email: "", address: "" }
  });

  const openNew = () => { setEditingId(null); form.reset({ code: "", name: "", contactPerson: "", phone: "", email: "", address: "" }); setDialogOpen(true); };
  const openEdit = (f: any) => { setEditingId(f.id); form.reset({ code: f.code, name: f.name, contactPerson: f.contactPerson || "", phone: f.phone || "", email: f.email || "", address: f.address || "" }); setDialogOpen(true); };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const action = editingId ? updateFactory.mutateAsync({ id: editingId, data: values }) : createFactory.mutateAsync({ data: values });
    action.then(() => {
      toast({ title: editingId ? "Factory updated" : "Factory created" });
      queryClient.invalidateQueries({ queryKey: ["/api/factories"] });
      setDialogOpen(false);
    }).catch((err: any) => toast({ variant: "destructive", title: "Error", description: err.message }));
  };

  const handleArchive = (id: number) => {
    if(confirm("Archive this factory?")) {
      archiveFactory.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/factories"] })
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Factories</h1>
          <p className="text-gray-500 mt-1">Manage factory partners and their details.</p>
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
              <TableHead>Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : factories?.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-sm">{f.code}</TableCell>
                <TableCell className="font-medium text-gray-900">{f.name}</TableCell>
                <TableCell>{f.contactPerson || "—"}</TableCell>
                <TableCell>{f.phone || "—"}</TableCell>
                <TableCell><Badge variant={f.isActive ? "default" : "secondary"} className={f.isActive ? "bg-green-100 text-green-800" : ""}>{f.isActive ? "Active" : "Archived"}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(f)}><Edit className="w-4 h-4 text-gray-500" /></Button>
                    {f.isActive && <Button variant="ghost" size="sm" onClick={() => handleArchive(f.id)}><Archive className="w-4 h-4 text-red-400 hover:text-red-600" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Factory</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>Code *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                  <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex justify-end pt-4"><Button type="submit" disabled={createFactory.isPending || updateFactory.isPending} className="bg-indigo-600">Save</Button></div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}