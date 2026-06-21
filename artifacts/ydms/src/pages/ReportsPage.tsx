import { useState } from "react";
import { useGetDailyReport, useGetMonthlyReport, useGetFactoryReport, useGetBuyerReport } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30*86400000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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
              <DailyReport date={date} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
              </div>
              <MonthlyReport month={month} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factory">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-48" />
                <span>to</span>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-48" />
              </div>
              <FactoryReport start={startDate} end={endDate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buyer">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-48" />
                <span>to</span>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-48" />
              </div>
              <BuyerReport start={startDate} end={endDate} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DailyReport({ date }: { date: string }) {
  const { data, isLoading } = useGetDailyReport({ date });
  if (isLoading) return <Skeleton className="h-48" />;
  return (
    <Table>
      <TableHeader className="bg-gray-50"><TableRow><TableHead>Factory</TableHead><TableHead className="text-right">Received (KG)</TableHead><TableHead className="text-right">Delivered (KG)</TableHead></TableRow></TableHeader>
      <TableBody>
        {data?.length ? data.map((d: any, i: number) => (
          <TableRow key={i}><TableCell className="font-medium">{d.factoryName}</TableCell><TableCell className="text-right">{d.receivedKg}</TableCell><TableCell className="text-right">{d.deliveredKg}</TableCell></TableRow>
        )) : <TableRow><TableCell colSpan={3} className="text-center py-8">No data for this date</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}

function MonthlyReport({ month }: { month: string }) {
  const [year, m] = month.split('-');
  const { data, isLoading } = useGetMonthlyReport({ year: Number(year), month: Number(m) });
  if (isLoading) return <Skeleton className="h-48" />;
  return (
    <Table>
      <TableHeader className="bg-gray-50"><TableRow><TableHead>Factory</TableHead><TableHead className="text-right">Total Orders</TableHead><TableHead className="text-right">Total KG</TableHead></TableRow></TableHeader>
      <TableBody>
        {data?.length ? data.map((d: any, i: number) => (
          <TableRow key={i}><TableCell className="font-medium">{d.factoryName}</TableCell><TableCell className="text-right">{d.totalOrders}</TableCell><TableCell className="text-right">{d.totalKg}</TableCell></TableRow>
        )) : <TableRow><TableCell colSpan={3} className="text-center py-8">No data for this month</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}

function FactoryReport({ start, end }: { start: string, end: string }) {
  const { data, isLoading } = useGetFactoryReport({ startDate: start, endDate: end });
  if (isLoading) return <Skeleton className="h-48" />;
  return (
    <Table>
      <TableHeader className="bg-gray-50"><TableRow><TableHead>Factory</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">On Time Delivery %</TableHead></TableRow></TableHeader>
      <TableBody>
        {data?.length ? data.map((d: any, i: number) => (
          <TableRow key={i}><TableCell className="font-medium">{d.factoryName}</TableCell><TableCell className="text-right">{d.totalOrders}</TableCell><TableCell className="text-right">{d.onTimePercentage}%</TableCell></TableRow>
        )) : <TableRow><TableCell colSpan={3} className="text-center py-8">No data</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}

function BuyerReport({ start, end }: { start: string, end: string }) {
  const { data, isLoading } = useGetBuyerReport({ startDate: start, endDate: end });
  if (isLoading) return <Skeleton className="h-48" />;
  return (
    <Table>
      <TableHeader className="bg-gray-50"><TableRow><TableHead>Buyer</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Total KG</TableHead></TableRow></TableHeader>
      <TableBody>
        {data?.length ? data.map((d: any, i: number) => (
          <TableRow key={i}><TableCell className="font-medium">{d.buyerName}</TableCell><TableCell className="text-right">{d.totalOrders}</TableCell><TableCell className="text-right">{d.totalKg}</TableCell></TableRow>
        )) : <TableRow><TableCell colSpan={3} className="text-center py-8">No data</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}