import { useRef, useEffect } from "react";
import { UseFormReturn, FieldArrayWithId } from "react-hook-form";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { FormValues } from "./newOrderSchema";

type ColorRow = FormValues["colorRows"][number];

interface NewOrderColorRowsProps {
  form: UseFormReturn<FormValues>;
  fields: FieldArrayWithId<FormValues, "colorRows", "id">[];
  append: (value: ColorRow) => void;
  remove: (index: number) => void;
  selectedYarnTypeName: string | null;
  rawMaterialsLoading: boolean;
  filteredYarnCounts: string[];
  totalQty: number;
  activeProcessLoss: number | null;
  processLossAmt: number | null;
  grandTotal: number | null;
  watchedOrderType: string;
  remarks: string;
}

export function NewOrderColorRows({
  form,
  fields,
  append,
  remove,
  selectedYarnTypeName,
  rawMaterialsLoading,
  filteredYarnCounts,
  totalQty,
  activeProcessLoss,
  processLossAmt,
  grandTotal,
  watchedOrderType,
  remarks,
}: NewOrderColorRowsProps) {
  const prevLengthRef = useRef(fields.length);

  useEffect(() => {
    if (fields.length <= prevLengthRef.current) {
      prevLengthRef.current = fields.length;
      return;
    }
    prevLengthRef.current = fields.length;

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

  return (
    <>
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
            {fields.map((field, index) => (
              <tr key={field.id} data-color-row className="border-b last:border-0">
                <td className="py-1 px-2 text-gray-400 font-medium">{index + 1}</td>
                <td className="py-1 px-1">
                  <FormField
                    control={form.control}
                    name={`colorRows.${index}.yarnCount`}
                    render={({ field: f }) => (
                      <FormItem className="m-0">
                        <Select
                          onValueChange={f.onChange}
                          value={f.value ?? ""}
                          disabled={!selectedYarnTypeName}
                        >
                          <FormControl>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue
                                placeholder={
                                  !selectedYarnTypeName
                                    ? "Select factory first"
                                    : rawMaterialsLoading
                                    ? "Loading..."
                                    : filteredYarnCounts.length
                                    ? "Select…"
                                    : "No data"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredYarnCounts.map((yc) => (
                              <SelectItem key={yc} value={yc}>{yc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </td>
                <td className="py-1 px-1">
                  <FormField
                    control={form.control}
                    name={`colorRows.${index}.colorName`}
                    render={({ field: f }) => (
                      <FormItem className="m-0">
                        <FormControl>
                          <Input {...f} placeholder="e.g. Red / Pantone 485C" className="h-7 text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="py-1 px-1">
                  <FormField
                    control={form.control}
                    name={`colorRows.${index}.colorRef`}
                    render={({ field: f }) => (
                      <FormItem className="m-0">
                        <FormControl>
                          <Input {...f} placeholder="e.g. S/OK" className="h-7 text-xs" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </td>
                <td className="py-1 px-1">
                  <FormField
                    control={form.control}
                    name={`colorRows.${index}.qtyKg`}
                    render={({ field: f }) => (
                      <FormItem className="m-0">
                        <FormControl>
                          <Input {...f} type="number" step="0.01" placeholder="0.00" className="h-7 text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="py-1 px-2">
                  <span className="text-xs text-gray-500 bg-gray-50 rounded px-1.5 py-1 block min-w-[120px]">
                    {remarks || <span className="text-gray-300 italic">auto-filled</span>}
                  </span>
                </td>
                <td className="py-1 px-1">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-400 hover:text-red-600"
                    >
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
              <td className="py-1.5 px-2 font-semibold text-xs">
                {totalQty > 0 ? `${totalQty.toFixed(2)} Kg` : "—"}
              </td>
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
              <span className="ml-1.5 text-indigo-500">
                ({activeProcessLoss}% — {watchedOrderType})
              </span>
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
    </>
  );
}
