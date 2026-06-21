import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MasterCombobox } from "@/components/MasterCombobox";
import type { CustomerGarmentsItem, UnitTypeItem } from "@workspace/api-client-react";
import { FormValues } from "./newOrderSchema";

interface NewOrderInfoCardProps {
  form: UseFormReturn<FormValues>;
  factories: any[] | undefined;
  onFactoryChange: (id: string) => void;
  customerGarments: CustomerGarmentsItem[] | undefined;
  customerGarmentsLoading: boolean;
  onAddCustomerGarment: (name: string) => Promise<void>;
  customerGarmentSaving: boolean;
  unitTypes: UnitTypeItem[] | undefined;
  unitTypesLoading: boolean;
  onAddUnitType: (name: string) => Promise<void>;
  unitTypeSaving: boolean;
}

export function NewOrderInfoCard({
  form,
  factories,
  onFactoryChange,
  customerGarments,
  customerGarmentsLoading,
  onAddCustomerGarment,
  customerGarmentSaving,
  unitTypes,
  unitTypesLoading,
  onAddUnitType,
  unitTypeSaving,
}: NewOrderInfoCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Date / Order info row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField
            control={form.control}
            name="orderNo"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Order No</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Auto-generated" className="h-8 text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="orderType"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Order Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
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
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="h-8 text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deliveryDate"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Delivery Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="h-8 text-sm" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Customer / Job row */}
        <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField
            control={form.control}
            name="customerGarmentsName"
            render={({ field }) => (
              <FormItem className="space-y-1 col-span-2">
                <FormLabel className="text-xs">Customer / Garments Name</FormLabel>
                <FormControl>
                  <MasterCombobox
                    value={field.value || ""}
                    onChange={field.onChange}
                    options={(customerGarments ?? []).map((cg) => ({
                      id: cg.id,
                      name: cg.name,
                    }))}
                    isLoading={customerGarmentsLoading}
                    isSaving={customerGarmentSaving}
                    placeholder="Select or type..."
                    addNewLabel="Add new garment"
                    onAddNew={onAddCustomerGarment}
                    className="w-full"
                    autoTitleCase
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jobNo"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Job No</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-sm" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Unit</FormLabel>
                <FormControl>
                  <MasterCombobox
                    value={field.value || ""}
                    onChange={field.onChange}
                    options={(unitTypes ?? []).map((ut) => ({
                      id: ut.id,
                      name: ut.name,
                    }))}
                    isLoading={unitTypesLoading}
                    isSaving={unitTypeSaving}
                    placeholder="Select or type..."
                    addNewLabel="Add new unit"
                    onAddNew={onAddUnitType}
                    className="w-full"
                    autoTitleCase
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Factory / Buyer row */}
        <div className="border-t pt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="factoryId"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-medium text-gray-600">
                    Dyeing Factory *
                  </FormLabel>
                  <Select onValueChange={onFactoryChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select factory…" />
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attn"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-medium text-gray-600">
                    Contact Person
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      placeholder="e.g. Mr. Arif Sab"
                      className="h-9 text-sm bg-gray-50 cursor-not-allowed"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-medium text-gray-600">
                    Sender Person
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      placeholder="e.g. Md Masud Ibna Zahid"
                      className="h-9 text-sm bg-gray-50 cursor-not-allowed"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="buyerAddress"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-medium text-gray-600">Address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    readOnly
                    placeholder="Full address…"
                    className="h-9 text-sm bg-gray-50 cursor-not-allowed"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
