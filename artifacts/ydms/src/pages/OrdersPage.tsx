import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListYarnDyeingOrders, useListFactories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Eye } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Received": "bg-gray-100 text-gray-800 border-gray-200",
  "Lab Dip": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Dyeing Running": "bg-blue-100 text-blue-800 border-blue-200",
  "Finishing": "bg-purple-100 text-purple-800 border-purple-200",
  "Ready": "bg-green-100 text-green-800 border-green-200",
  "Delivered": "bg-teal-100 text-teal-800 border-teal-200",
};

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [factoryId, setFactoryId] = useState<string>("all");
  const [orderType, setOrderType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data: factories } = useListFactories();
  const { data: ordersData, isLoading } = useListYarnDyeingOrders({
    search: search || undefined,
    factoryId: factoryId !== "all" ? Number(factoryId) : undefined,
    orderType: orderType !== "all" ? (orderType as any) : undefined,
    status: status !== "all" ? status : undefined,
  });

  const orders = ordersData?.orders ?? [];

  let slCounter = 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all yarn dyeing orders.</p>
        </div>
        <Link href="/orders/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="new-order-btn">
            <Plus className="w-4 h-4 mr-2" /> New Order
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search Order No, Customer, Job No..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={factoryId} onValueChange={setFactoryId}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="All Factories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Factories</SelectItem>
            {factories?.map((f: any) => (
              <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={orderType} onValueChange={setOrderType}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Sample">Sample</SelectItem>
            <SelectItem value="Bulk">Bulk</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(STATUS_COLORS).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap w-10">SL</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Dyeing Factory</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Dyeing Order No</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Yarn Count</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Color Name / Pantone</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Color Ref / Swatch</th>
                <th className="py-3 px-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Qty (Kg)</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td colSpan={10} className="py-3 px-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : !orders.length ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-gray-400 text-sm">
                    No orders found. Try adjusting your filters or create a new order.
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => {
                  const colorRows: any[] = order.colorRows ?? [];
                  const rowCount = colorRows.length || 1;
                  slCounter += 1;
                  const sl = slCounter;

                  const orderCells = (
                    <>
                      <td
                        rowSpan={rowCount}
                        className="py-2.5 px-3 align-top border-r border-gray-100 text-gray-500 font-medium text-xs"
                      >
                        {sl}
                      </td>
                      <td
                        rowSpan={rowCount}
                        className="py-2.5 px-3 align-top border-r border-gray-100 font-medium text-gray-800 whitespace-nowrap"
                      >
                        {order.factoryName || "—"}
                      </td>
                      <td
                        rowSpan={rowCount}
                        className="py-2.5 px-3 align-top border-r border-gray-100"
                      >
                        <span className="font-semibold text-indigo-700">{order.orderNo}</span>
                        {order.orderType && (
                          <div className="mt-0.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${order.orderType === "Sample" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}
                            >
                              {order.orderType}
                            </Badge>
                          </div>
                        )}
                      </td>
                    </>
                  );

                  const actionCell = (
                    <td
                      rowSpan={rowCount}
                      className="py-2.5 px-3 align-top text-center border-l border-gray-100"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-indigo-50"
                        onClick={() => setLocation(`/orders/${order.id}`)}
                      >
                        <Eye className="h-4 w-4 text-gray-500" />
                      </Button>
                    </td>
                  );

                  const dateCell = (
                    <td
                      rowSpan={rowCount}
                      className="py-2.5 px-3 align-top border-l border-gray-100 text-gray-600 whitespace-nowrap text-xs"
                    >
                      {order.receiveDate}
                    </td>
                  );

                  const statusCell = (
                    <td
                      rowSpan={rowCount}
                      className="py-2.5 px-3 align-top border-l border-gray-100"
                    >
                      <Badge variant="outline" className={`text-xs whitespace-nowrap ${STATUS_COLORS[order.status] || ""}`}>
                        {order.status}
                      </Badge>
                    </td>
                  );

                  if (colorRows.length === 0) {
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setLocation(`/orders/${order.id}`)}
                      >
                        {orderCells}
                        <td className="py-2.5 px-3 text-gray-400">—</td>
                        <td className="py-2.5 px-3 text-gray-400">—</td>
                        <td className="py-2.5 px-3 text-gray-400">—</td>
                        <td className="py-2.5 px-3 text-right text-gray-400">—</td>
                        {dateCell}
                        {statusCell}
                        {actionCell}
                      </tr>
                    );
                  }

                  return colorRows.map((cr: any, idx: number) => (
                    <tr
                      key={`${order.id}-${cr.id ?? idx}`}
                      className={`border-b border-gray-100 hover:bg-indigo-50/30 cursor-pointer ${idx === 0 ? "border-t border-gray-200" : ""}`}
                      onClick={() => setLocation(`/orders/${order.id}`)}
                    >
                      {idx === 0 && orderCells}
                      <td className="py-2 px-3 text-gray-700 whitespace-nowrap text-xs">{cr.yarnCount || "—"}</td>
                      <td className="py-2 px-3 font-medium text-gray-900">{cr.colorName || "—"}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{cr.colorRef || "—"}</td>
                      <td className="py-2 px-3 text-right font-medium tabular-nums">{Number(cr.qtyKg).toFixed(2)}</td>
                      {idx === 0 && dateCell}
                      {idx === 0 && statusCell}
                      {idx === 0 && actionCell}
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>

        {ordersData && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {orders.length} order{orders.length !== 1 ? "s" : ""} · {ordersData.total} total</span>
          </div>
        )}
      </div>
    </div>
  );
}
