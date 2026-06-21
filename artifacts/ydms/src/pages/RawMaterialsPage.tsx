import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListRawMaterials,
  useCreateRawMaterial,
  useUpdateRawMaterial,
  useDeleteRawMaterial,
  getListRawMaterialsQueryKey,
  useListYarnTypes,
  useCreateYarnType,
  getListYarnTypesQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { YarnTypeSelect } from "@/components/ui/YarnTypeSelect";

const schema = z.object({
  yarnType: z.string().min(1, "Required"),
  yarnCount: z.string().min(1, "Required"),
  price: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

export default function RawMaterialsPage() {
  const { toast } = useToast();
  const { data: items = [], isLoading } = useListRawMaterials();
  const { data: yarnTypes = [] } = useListYarnTypes();
  const createMutation = useCreateRawMaterial();
  const updateMutation = useUpdateRawMaterial();
  const deleteMutation = useDeleteRawMaterial();
  const createYarnTypeMutation = useCreateYarnType();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { yarnType: "", yarnCount: "", price: "" },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { yarnType: "", yarnCount: "", price: "" },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListRawMaterialsQueryKey() });
  }

  async function handleCreateYarnType(name: string) {
    await new Promise<void>((resolve, reject) => {
      createYarnTypeMutation.mutate(
        { data: { name } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListYarnTypesQueryKey() });
            resolve();
          },
          onError: (err: any) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
            reject(err);
          },
        }
      );
    });
  }

  function onAdd(values: FormValues) {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Raw material added" });
          form.reset();
          setShowForm(false);
          invalidate();
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
      }
    );
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    editForm.reset({ yarnType: item.yarnType, yarnCount: item.yarnCount, price: item.price });
  }

  function onUpdate(values: FormValues) {
    if (editingId == null) return;
    updateMutation.mutate(
      { id: editingId, data: values },
      {
        onSuccess: () => {
          toast({ title: "Updated" });
          setEditingId(null);
          invalidate();
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
      }
    );
  }

  function onDelete(id: number) {
    if (!confirm("Delete this item?")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Deleted" });
          invalidate();
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
      }
    );
  }

  const yarnTypeOptions = yarnTypes.map((t: any) => ({ id: t.id, name: t.name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raw Materials</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage yarn types, counts, and prices.</p>
        </div>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 gap-1"
          onClick={() => { setShowForm((v) => !v); form.reset(); }}
        >
          <Plus className="h-4 w-4" />
          Add Material
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAdd)} className="flex items-end gap-3 flex-wrap">
                {/* Yarn Type — dropdown from server */}
                <FormField control={form.control} name="yarnType" render={({ field }) => (
                  <FormItem className="space-y-1 flex-1 min-w-44">
                    <FormLabel className="text-xs">Yarn Type *</FormLabel>
                    <FormControl>
                      <YarnTypeSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={yarnTypeOptions}
                        onCreateNew={handleCreateYarnType}
                        isCreating={createYarnTypeMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="yarnCount" render={({ field }) => (
                  <FormItem className="space-y-1 flex-1 min-w-28">
                    <FormLabel className="text-xs">Yarn Count *</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. 30/1" className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem className="space-y-1 flex-1 min-w-28">
                    <FormLabel className="text-xs">Price (per kg) *</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. 250.00" className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex gap-2 pb-0.5">
                  <Button type="submit" size="sm" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                    {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-0 pb-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 w-8">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Yarn Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Yarn Count</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Price (per kg)</th>
                  <th className="py-3 px-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400">No raw materials yet. Add one above.</td>
                  </tr>
                )}
                {items.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                    {editingId === item.id ? (
                      <>
                        <td className="py-2 px-4 text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <Controller
                            control={editForm.control}
                            name="yarnType"
                            render={({ field }) => (
                              <YarnTypeSelect
                                value={field.value}
                                onChange={field.onChange}
                                options={yarnTypeOptions}
                                onCreateNew={handleCreateYarnType}
                                isCreating={createYarnTypeMutation.isPending}
                                className="min-w-36"
                              />
                            )}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Controller
                            control={editForm.control}
                            name="yarnCount"
                            render={({ field }) => (
                              <Input {...field} className="h-7 text-xs" />
                            )}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Controller
                            control={editForm.control}
                            name="price"
                            render={({ field }) => (
                              <Input {...field} className="h-7 text-xs" />
                            )}
                          />
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex gap-1">
                            <button
                              onClick={editForm.handleSubmit(onUpdate)}
                              disabled={updateMutation.isPending}
                              className="text-green-600 hover:text-green-800"
                            >
                              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-800">{item.yarnType}</td>
                        <td className="py-3 px-4 text-gray-600">{item.yarnCount}</td>
                        <td className="py-3 px-4 text-gray-600">৳ {parseFloat(item.price).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-indigo-600">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDelete(item.id)}
                              disabled={deleteMutation.isPending}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
