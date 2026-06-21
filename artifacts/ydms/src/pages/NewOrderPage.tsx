import { useLocation } from "wouter";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateYarnDyeingOrder,
  useListFactories,
  useListYarnTypes,
  useListRawMaterials,
  useListCustomerGarments,
  useCreateCustomerGarments,
  useListUnitTypes,
  useCreateUnitType,
  getListYarnDyeingOrdersQueryKey,
  getListCustomerGarmentsQueryKey,
  getListUnitTypesQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ScanLine, AlertTriangle } from "lucide-react";
import { ScanOrderSheet, type ScannedOrderData } from "@/components/ScanOrderSheet";
import { formSchema, FormValues } from "./newOrderSchema";
import { NewOrderInfoCard } from "./NewOrderInfoCard";
import { NewOrderColorRows } from "./NewOrderColorRows";

export default function NewOrderPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: factories } = useListFactories();
  const { data: yarnTypes = [] } = useListYarnTypes();
  const { data: rawMaterialsData, isLoading: rawMaterialsLoading } = useListRawMaterials();
  const { data: customerGarments, isLoading: customerGarmentsLoading } = useListCustomerGarments();
  const { data: unitTypes, isLoading: unitTypesLoading } = useListUnitTypes();

  const createOrder = useCreateYarnDyeingOrder();
  const createCustomerGarment = useCreateCustomerGarments();
  const createUnitType = useCreateUnitType();

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
  const watchedCustomerGarmentsName = form.watch("customerGarmentsName");
  const watchedJobNo = form.watch("jobNo");
  const watchedUnit = form.watch("unit");

  const totalQty = watchedRows.reduce((sum, r) => sum + (Number(r.qtyKg) || 0), 0);
  const activeProcessLoss: number | null =
    watchedOrderType === "Bulk" ? selectedProcessLossBulk : selectedProcessLossSample;
  const processLossAmt = activeProcessLoss != null ? (totalQty * activeProcessLoss) / 100 : null;
  const grandTotal = processLossAmt != null ? totalQty + processLossAmt : null;
  const remarks = [watchedCustomerGarmentsName, watchedJobNo, watchedUnit]
    .filter(Boolean)
    .join(" | ");

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
        (f) =>
          normalize(f.name ?? "").includes(normalize(data.factoryName!)) ||
          normalize(data.factoryName!).includes(normalize(f.name ?? ""))
      );
      if (matched) {
        handleFactoryChange(matched.id.toString());
      } else {
        setScanWarning(
          `"${data.factoryName}" এই factory টি system-এ নেই। আগে Factory list-এ add করুন।`
        );
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
      form.setValue("colorRows", isEmpty ? newRows : [...existing, ...newRows]);
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
      const yarnTypeId = (selected as any).yarnTypeId;
      const matchedYarnType = (yarnTypes as any[]).find((y: any) => y.id === yarnTypeId);
      setSelectedYarnTypeName(matchedYarnType?.name ?? null);
      form.setValue("yarnType", matchedYarnType?.name ?? "");
      setSelectedProcessLossBulk(
        selected.processLossBulk != null ? Number(selected.processLossBulk) : null
      );
      setSelectedProcessLossSample(
        selected.processLossSample != null ? Number(selected.processLossSample) : null
      );
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
    const remarksStr = [values.customerGarmentsName, values.jobNo, values.unit]
      .filter(Boolean)
      .join(" | ");

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
          yarnType: values.yarnType || undefined,
          processLossPct: activeProcessLoss ?? undefined,
          processLossKg: processLossAmt ?? undefined,
          grandTotalKg: grandTotal ?? undefined,
          colorRows: values.colorRows.map((r) => ({
            yarnCount: r.yarnCount || undefined,
            colorName: r.colorName,
            colorRef: r.colorRef || undefined,
            qtyKg: r.qtyKg,
            remarks: remarksStr || undefined,
          })),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Order created successfully" });
          queryClient.invalidateQueries({ queryKey: getListYarnDyeingOrdersQueryKey() });
          setLocation("/orders");
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: err.message || "Failed to create order",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocation("/orders")}
          >
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
          <button
            onClick={() => setScanWarning(null)}
            className="ml-auto text-amber-500 hover:text-amber-700"
          >
            ✕
          </button>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <NewOrderInfoCard
            form={form}
            factories={factories as any[]}
            onFactoryChange={handleFactoryChange}
            customerGarments={customerGarments}
            customerGarmentsLoading={customerGarmentsLoading}
            onAddCustomerGarment={async (name) => {
              await createCustomerGarment.mutateAsync({ data: { name } });
              queryClient.invalidateQueries({ queryKey: getListCustomerGarmentsQueryKey() });
            }}
            customerGarmentSaving={createCustomerGarment.isPending}
            unitTypes={unitTypes}
            unitTypesLoading={unitTypesLoading}
            onAddUnitType={async (name) => {
              await createUnitType.mutateAsync({ data: { name } });
              queryClient.invalidateQueries({ queryKey: getListUnitTypesQueryKey() });
            }}
            unitTypeSaving={createUnitType.isPending}
          />

          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Color Details</p>
              <NewOrderColorRows
                form={form}
                fields={fields}
                append={append}
                remove={remove}
                selectedYarnTypeName={selectedYarnTypeName}
                rawMaterialsLoading={rawMaterialsLoading}
                filteredYarnCounts={filteredYarnCounts}
                totalQty={totalQty}
                activeProcessLoss={activeProcessLoss}
                processLossAmt={processLossAmt}
                grandTotal={grandTotal}
                watchedOrderType={watchedOrderType}
                remarks={remarks}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocation("/orders")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createOrder.isPending}
              className="bg-indigo-600 hover.bg-indigo-700"
            >
              {createOrder.isPending && (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              )}
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
