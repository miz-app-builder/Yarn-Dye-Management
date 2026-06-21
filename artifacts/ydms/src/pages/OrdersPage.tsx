import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListYarnDyeingOrders, useListFactories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">Manage all yarn dyeing orders.</p>
        </div>
        <Link href="/orders/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="new-order-btn">
            <Plus className="w-4 h-4 mr-2" /> New Order
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by Order No, Customer or Job No..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={factoryId} onValueChange={setFactoryId}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Sample">Sample</SelectItem>
            <SelectItem value="Bulk">Bulk</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
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
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Order No</TableHead>
              <TableHead>Customer / Garments</TableHead>
              <TableHead>Job No</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Factory</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9} className="py-4">
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : !ordersData?.orders?.length ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                  No orders found. Try adjusting your filters or create a new order.
                </TableCell>
              </TableRow>
            ) : (
              ordersData.orders.map((order: any) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setLocation(`/orders/${order.id}`)}
                >
                  <TableCell className="font-medium text-indigo-700">{order.orderNo}</TableCell>
                  <TableCell>{order.customerGarmentsName || order.buyerName || "—"}</TableCell>
                  <TableCell className="text-gray-600">{order.jobNo || "—"}</TableCell>
                  <TableCell className="text-gray-600">{order.unit || "—"}</TableCell>
                  <TableCell>{order.factoryName || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={order.orderType === "Sample"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"}
                    >
                      {order.orderType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">{order.receiveDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[order.status] || ""}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => { e.stopPropagation(); setLocation(`/orders/${order.id}`); }}
                    >
                      <Eye className="h-4 w-4 text-gray-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
