import { useParams, useLocation } from "wouter";
import {
  useGetYarnDyeingOrder, useDeleteYarnDyeingOrder,
  getGetYarnDyeingOrderQueryKey, getListYarnDyeingOrdersQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Pencil, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Received": "bg-gray-100 text-gray-800",
  "Lab Dip": "bg-yellow-100 text-yellow-800",
  "Dyeing Running": "bg-blue-100 text-blue-800",
  "Finishing": "bg-purple-100 text-purple-800",
  "Ready": "bg-green-100 text-green-800",
  "Delivered": "bg-teal-100 text-teal-800",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: order, isLoading } = useGetYarnDyeingOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetYarnDyeingOrderQueryKey(orderId) }
  });

  const deleteOrder = useDeleteYarnDyeingOrder();

  if (isLoading) return (
    <div className="space-y-4 p-8">
      <Skeleton className="h-12 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
  if (!order) return <div className="p-8 text-center text-gray-500">Order not found</div>;

  const colorRows: any[] = (order as any).colorRows ?? [];
  const totalQty = colorRows.reduce((sum: number, r: any) => sum + (Number(r.qtyKg) || 0), 0);

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this order?")) return;
    deleteOrder.mutate({ id: orderId }, {
      onSuccess: () => {
        toast({ title: "Order deleted" });
        queryClient.invalidateQueries({ queryKey: getListYarnDyeingOrdersQueryKey() });
        setLocation("/orders");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.message || "Failed to delete order" });
      },
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{order.orderNo}</h1>
              <Badge className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"}>{order.status}</Badge>
              <Badge variant="outline">{order.orderType}</Badge>
            </div>
            <p className="text-gray-500 mt-0.5 text-sm">
              {order.buyerName}{order.customerGarmentsName ? ` · ${order.customerGarmentsName}` : ""}{order.factoryName ? ` · ${order.factoryName}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation(`/orders/${orderId}/edit`)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleteOrder.isPending}
          >
            {deleteOrder.isPending
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-4">
              <div><p className="text-xs text-gray-500 mb-1">Order No</p><p className="font-medium text-sm">{order.orderNo}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Order Type</p><p className="font-medium text-sm">{order.orderType}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Status</p><p className="font-medium text-sm">{order.status}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Buyer Name</p><p className="font-medium text-sm">{order.buyerName || "—"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Customer/Garments</p><p className="font-medium text-sm">{order.customerGarmentsName || "—"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Job No</p><p className="font-medium text-sm">{order.jobNo || "—"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Unit</p><p className="font-medium text-sm">{order.unit || "—"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Factory</p><p className="font-medium text-sm">{order.factoryName || "—"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Yarn Type</p><p className="font-medium text-sm">{order.yarnType || "—"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Receive Date</p><p className="font-medium text-sm">{order.receiveDate ? new Date(order.receiveDate).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Delivery Date</p><p className="font-medium text-sm">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Total Qty</p><p className="font-medium text-sm">{totalQty > 0 ? `${totalQty.toFixed(2)} Kg` : "—"}</p></div>
              {order.remarks && (
                <div className="col-span-2 md:col-span-3"><p className="text-xs text-gray-500 mb-1">Remarks</p><p className="text-sm text-gray-700">{order.remarks}</p></div>
              )}
            </CardContent>
          </Card>

          {colorRows.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Color Rows</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500">
                      <th className="py-1.5 px-2 text-left w-8">#</th>
                      <th className="py-1.5 px-2 text-left">Yarn Count</th>
                      <th className="py-1.5 px-2 text-left">Color Name</th>
                      <th className="py-1.5 px-2 text-left">Color Ref</th>
                      <th className="py-1.5 px-2 text-right">Qty (Kg)</th>
                      <th className="py-1.5 px-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colorRows.map((row: any, idx: number) => (
                      <tr key={row.id ?? idx} className="border-b last:border-0">
                        <td className="py-1.5 px-2 text-gray-400">{idx + 1}</td>
                        <td className="py-1.5 px-2">{row.yarnCount || "—"}</td>
                        <td className="py-1.5 px-2 font-medium">{row.colorName}</td>
                        <td className="py-1.5 px-2 text-gray-500">{row.colorRef || "—"}</td>
                        <td className="py-1.5 px-2 text-right font-medium">{Number(row.qtyKg).toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-gray-500">{row.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-gray-50">
                      <td colSpan={4} className="py-1.5 px-2 text-right text-xs font-semibold text-gray-600">Total</td>
                      <td className="py-1.5 px-2 text-right text-xs font-semibold">{totalQty.toFixed(2)} Kg</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              {order.fromPerson && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">From</span>
                  <span className="font-medium">{order.fromPerson}</span>
                </div>
              )}
              {(order as any).attn && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Attn</span>
                  <span className="font-medium">{(order as any).attn}</span>
                </div>
              )}
              {(order as any).buyerAddress && (
                <div className="text-sm">
                  <p className="text-gray-500 mb-1">Buyer Address</p>
                  <p className="text-gray-700">{(order as any).buyerAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
