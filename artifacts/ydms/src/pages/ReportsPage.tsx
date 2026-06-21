import { useState } from "react";
import { useGetDailyReport, useGetMonthlyReport, useGetFactoryReport, useGetBuyerReport } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Analytics and summaries of production.</p>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="mb-6 bg-gray-100">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="factory">Factory-wise</TabsTrigger>
          <TabsTrigger value="buyer">Buyer-wise</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
              </div>
              <DailyReportView date={date} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
              </div>
              <MonthlyReportView month={month} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factory">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <FactoryReportView />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buyer">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <BuyerReportView />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DailyReportView({ date }: { date: string }) {
  const { data, isLoading } = useGetDailyReport({ date });
  if (isLoading) return <Skeleton className="h-48" />;
  if (!data) return <div className="text-center py-8 text-gray-500">No data for this date</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-gray-50 border p-4">
          <p className="text-sm text-gray-500">Orders Received</p>
          <p className="text-2xl font-bold mt-1">{data.ordersReceived}</p>
        </div>
        <div className="rounded-lg bg-gray-50 border p-4">
          <p className="text-sm text-gray-500">Total KG</p>
          <p className="text-2xl font-bold mt-1">{data.totalKg} kg</p>
        </div>
        <div className="rounded-lg bg-gray-50 border p-4">
          <p className="text-sm text-gray-500">Delivered Orders</p>
          <p className="text-2xl font-bold mt-1">{data.deliveredOrders}</p>
        </div>
      </div>
      {data.orders && data.orders.length > 0 && (
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Order No</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Qty (KG)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.orders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-sm">{o.orderNo}</TableCell>
                <TableCell>{o.buyerName}</TableCell>
                <TableCell>{o.color}</TableCell>
                <TableCell className="text-right">{o.quantityKg}</TableCell>
                <TableCell>{o.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function MonthlyReportView({ month }: { month: string }) {
  const [year, m] = month.split("-");
  const { data, isLoading } = useGetMonthlyReport({ year: Number(year), month: Number(m) });
  if (isLoading) return <Skeleton className="h-48" />;
  if (!data) return <div className="text-center py-8 text-gray-500">No data for this month</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="rounded-lg bg-gray-50 border p-4">
        <p className="text-sm text-gray-500">Total Orders</p>
        <p className="text-2xl font-bold mt-1">{data.totalOrders}</p>
      </div>
      <div className="rounded-lg bg-gray-50 border p-4">
        <p className="text-sm text-gray-500">Total KG</p>
        <p className="text-2xl font-bold mt-1">{data.totalKg} kg</p>
      </div>
      <div className="rounded-lg bg-gray-50 border p-4">
        <p className="text-sm text-gray-500">Sample Orders</p>
        <p className="text-2xl font-bold mt-1">{data.sampleOrders}</p>
      </div>
      <div className="rounded-lg bg-gray-50 border p-4">
        <p className="text-sm text-gray-500">Bulk Orders</p>
        <p className="text-2xl font-bold mt-1">{data.bulkOrders}</p>
      </div>
      {data.deliveredOrders !== undefined && (
        <div className="rounded-lg bg-gray-50 border p-4">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-2xl font-bold mt-1">{data.deliveredOrders}</p>
        </div>
      )}
    </div>
  );
}

function FactoryReportView() {
  const { data, isLoading } = useGetFactoryReport();
  if (isLoading) return <Skeleton className="h-48" />;
  return (
    <Table>
      <TableHeader className="bg-gray-50">
        <TableRow>
          <TableHead>Factory</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Total KG</TableHead>
          <TableHead className="text-right">On Time %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!data?.length ? (
          <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">No factory data</TableCell></TableRow>
        ) : data.map((d: any, i: number) => (
          <TableRow key={i}>
            <TableCell className="font-medium">{d.factoryName}</TableCell>
            <TableCell className="text-right">{d.totalOrders}</TableCell>
            <TableCell className="text-right">{d.totalKg}</TableCell>
            <TableCell className="text-right">{d.onTimePercentage ?? "—"}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BuyerReportView() {
  const { data, isLoading } = useGetBuyerReport();
  if (isLoading) return <Skeleton className="h-48" />;
  return (
    <Table>
      <TableHeader className="bg-gray-50">
        <TableRow>
          <TableHead>Buyer</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Total KG</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!data?.length ? (
          <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-500">No buyer data</TableCell></TableRow>
        ) : data.map((d: any, i: number) => (
          <TableRow key={i}>
            <TableCell className="font-medium">{d.buyerName}</TableCell>
            <TableCell className="text-right">{d.totalOrders}</TableCell>
            <TableCell className="text-right">{d.totalKg}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
