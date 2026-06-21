// Dashboard implementation
import { useGetDashboardSummary, useGetFactoryPerformance, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: factoryPerf, isLoading: isLoadingFactory } = useGetFactoryPerformance();
  const { data: activities, isLoading: isLoadingActivity } = useGetRecentActivity();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your yarn dyeing operations today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {isLoadingSummary ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : (
          <>
            <SummaryCard title="Today Received" value={summary?.todayReceived} />
            <SummaryCard title="Running Orders" value={summary?.runningOrders} />
            <SummaryCard title="Pending (Lab/Dye)" value={summary?.pendingOrders} />
            <SummaryCard title="Delivered" value={summary?.deliveredOrders} />
            <SummaryCard title="Total KG" value={summary?.totalKg ? `${summary.totalKg} kg` : "0 kg"} />
          </>
        )}
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Factory Performance</h2>
          <Card className="border-gray-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Factory</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total KG</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">On Time %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingFactory ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
                  ) : factoryPerf?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No factory data available</TableCell></TableRow>
                  ) : (
                    factoryPerf?.map((factory: any) => (
                      <TableRow key={factory.factoryId}>
                        <TableCell className="font-medium">{factory.factoryName}</TableCell>
                        <TableCell className="text-right">{factory.totalOrders}</TableCell>
                        <TableCell className="text-right">{factory.totalKg}</TableCell>
                        <TableCell className="text-right">{factory.deliveredOrders}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={factory.onTimePercentage >= 90 ? "default" : factory.onTimePercentage >= 75 ? "secondary" : "destructive"}
                            className={factory.onTimePercentage >= 90 ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                            {factory.onTimePercentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-4">
              {isLoadingActivity ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : activities?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No recent activity</div>
              ) : (
                activities?.map((activity: any) => (
                  <div key={activity.id} className="flex gap-4 items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.orderNo}</span> moved to <span className="font-medium text-indigo-700">{activity.status}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.createdAt).toLocaleString()} • {activity.factoryName}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string, value: any }) {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value ?? 0}</div>
      </CardContent>
    </Card>
  );
}