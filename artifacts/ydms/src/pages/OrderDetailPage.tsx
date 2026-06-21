import { useRef } from "react";
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
import { ArrowLeft, Trash2, Pencil, Loader2, FileDown, FileSpreadsheet, Printer, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_COLORS: Record<string, string> = {
  "Received": "bg-gray-100 text-gray-800",
  "Lab Dip": "bg-yellow-100 text-yellow-800",
  "Dyeing Running": "bg-blue-100 text-blue-800",
  "Finishing": "bg-purple-100 text-purple-800",
  "Ready": "bg-green-100 text-green-800",
  "Delivered": "bg-teal-100 text-teal-800",
};

async function exportToPdf(order: any, colorRows: any[], totalQty: number) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Yarn Dyeing Management System", margin, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Dyeing Order Details", margin, 25);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Order No: ${order.orderNo}`, margin, 34);
  doc.setFont("helvetica", "normal");
  doc.text(`Status: ${order.status}`, margin + 80, 34);
  doc.text(`Type: ${order.orderType}`, margin + 140, 34);

  let y = 40;
  doc.setFontSize(9);
  const infoLeft = [
    ["Buyer Name", order.buyerName || "—"],
    ["Customer / Garments", order.customerGarmentsName || "—"],
    ["Job No", order.jobNo || "—"],
    ["Unit", order.unit || "—"],
  ];
  const infoRight = [
    ["Factory", order.factoryName || "—"],
    ["Yarn Type", order.yarnType || "—"],
    ["Receive Date", order.receiveDate || "—"],
    ["Delivery Date", order.deliveryDate || "—"],
  ];

  infoLeft.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y + i * 6);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), margin + 40, y + i * 6);
  });
  infoRight.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, pageW / 2 + 4, y + i * 6);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), pageW / 2 + 40, y + i * 6);
  });

  if (order.remarks) {
    y += infoLeft.length * 6 + 4;
    doc.setFont("helvetica", "bold");
    doc.text("Remarks:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(order.remarks, margin + 20, y);
  }

  y = 68;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Color Rows", margin, y);

  autoTable(doc, {
    startY: y + 4,
    head: [["#", "Yarn Count", "Color Name", "Color Ref / Swatch", "Qty (Kg)", "Remarks"]],
    body: colorRows.map((cr, i) => [
      i + 1,
      cr.yarnCount || "—",
      cr.colorName || "—",
      cr.colorRef || "—",
      Number(cr.qtyKg).toFixed(2),
      cr.remarks || "—",
    ]),
    foot: [["", "", "", "Total", totalQty.toFixed(2), ""]],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], fontSize: 9, fontStyle: "bold" },
    footStyles: { fillColor: [240, 240, 255], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 4: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, doc.internal.pageSize.getHeight() - 8, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(`${order.orderNo}.pdf`);
}

async function exportToExcel(order: any, colorRows: any[], totalQty: number) {
  const XLSX = await import("xlsx");

  const info = [
    ["Yarn Dyeing Management System — Order Export"],
    [],
    ["Order No", order.orderNo, "", "Status", order.status],
    ["Type", order.orderType, "", "Factory", order.factoryName || "—"],
    ["Buyer Name", order.buyerName || "—", "", "Yarn Type", order.yarnType || "—"],
    ["Customer/Garments", order.customerGarmentsName || "—", "", "Job No", order.jobNo || "—"],
    ["Receive Date", order.receiveDate || "—", "", "Delivery Date", order.deliveryDate || "—"],
    ["Unit", order.unit || "—", "", "Remarks", order.remarks || "—"],
    [],
    ["#", "Yarn Count", "Color Name", "Color Ref / Swatch", "Qty (Kg)", "Remarks"],
    ...colorRows.map((cr, i) => [
      i + 1,
      cr.yarnCount || "",
      cr.colorName || "",
      cr.colorRef || "",
      Number(cr.qtyKg),
      cr.remarks || "",
    ]),
    ["", "", "", "Total", totalQty, ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(info);
  ws["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 5 }, { wch: 22 }, { wch: 20 }, { wch: 25 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order");
  XLSX.writeFile(wb, `${order.orderNo}.xlsx`);
}

function printOrder(order: any, colorRows: any[], totalQty: number) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${order.orderNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
        h1 { font-size: 16px; margin-bottom: 2px; }
        .subtitle { color: #555; margin-bottom: 14px; font-size: 12px; }
        .header-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .order-no { font-size: 14px; font-weight: bold; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 14px; }
        .meta-item { display: flex; gap: 6px; }
        .meta-label { font-weight: bold; color: #444; min-width: 130px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #4f46e5; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
        tfoot td { font-weight: bold; background: #f0f0ff; }
        .text-right { text-align: right; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <h1>Yarn Dyeing Management System</h1>
      <div class="subtitle">Dyeing Order Details</div>
      <div class="header-row">
        <span class="order-no">Order No: ${order.orderNo}</span>
        <span>Status: <strong>${order.status}</strong> &nbsp;|&nbsp; Type: <strong>${order.orderType}</strong></span>
      </div>
      <div class="meta">
        <div class="meta-item"><span class="meta-label">Buyer Name:</span><span>${order.buyerName || "—"}</span></div>
        <div class="meta-item"><span class="meta-label">Factory:</span><span>${order.factoryName || "—"}</span></div>
        <div class="meta-item"><span class="meta-label">Customer/Garments:</span><span>${order.customerGarmentsName || "—"}</span></div>
        <div class="meta-item"><span class="meta-label">Yarn Type:</span><span>${order.yarnType || "—"}</span></div>
        <div class="meta-item"><span class="meta-label">Job No:</span><span>${order.jobNo || "—"}</span></div>
        <div class="meta-item"><span class="meta-label">Unit:</span><span>${order.unit || "—"}</span></div>
        <div class="meta-item"><span class="meta-label">Receive Date:</span><span>${order.receiveDate || "—"}</span></div>
        <div class="meta-item"><span class="meta-label">Delivery Date:</span><span>${order.deliveryDate || "—"}</span></div>
        ${order.remarks ? `<div class="meta-item" style="grid-column:1/-1"><span class="meta-label">Remarks:</span><span>${order.remarks}</span></div>` : ""}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Yarn Count</th><th>Color Name</th><th>Color Ref / Swatch</th><th class="text-right">Qty (Kg)</th><th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${colorRows.map((cr, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${cr.yarnCount || "—"}</td>
              <td>${cr.colorName || "—"}</td>
              <td>${cr.colorRef || "—"}</td>
              <td class="text-right">${Number(cr.qtyKg).toFixed(2)}</td>
              <td>${cr.remarks || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr><td colspan="4" style="text-align:right">Total</td><td class="text-right">${totalQty.toFixed(2)}</td><td></td></tr>
        </tfoot>
      </table>
      <p style="margin-top:16px;color:#888;font-size:9px">Printed: ${new Date().toLocaleString()}</p>
    </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

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
    <div ref={printRef} className="max-w-5xl mx-auto space-y-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-gray-700">
                <FileDown className="w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => exportToPdf(order, colorRows, totalQty)}
              >
                <FileDown className="w-4 h-4 text-red-500" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => exportToExcel(order, colorRows, totalQty)}
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                Download Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => printOrder(order, colorRows, totalQty)}
              >
                <Printer className="w-4 h-4 text-gray-600" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => setLocation(`/orders/${orderId}/edit`)}
              >
                <Pencil className="w-4 h-4 text-gray-500" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                onClick={handleDelete}
                disabled={deleteOrder.isPending}
              >
                {deleteOrder.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <CardContent className="pt-4 overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs text-gray-500">
                      <th className="py-2 px-4 text-left w-8">#</th>
                      <th className="py-2 px-3 text-left">Yarn Count</th>
                      <th className="py-2 px-3 text-left">Color Name</th>
                      <th className="py-2 px-3 text-left">Color Ref</th>
                      <th className="py-2 px-3 text-right">Qty (Kg)</th>
                      <th className="py-2 px-3 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colorRows.map((row: any, idx: number) => (
                      <tr key={row.id ?? idx} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-4 text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3">{row.yarnCount || "—"}</td>
                        <td className="py-2 px-3 font-medium">{row.colorName}</td>
                        <td className="py-2 px-3 text-gray-500">{row.colorRef || "—"}</td>
                        <td className="py-2 px-3 text-right font-medium tabular-nums">{Number(row.qtyKg).toFixed(2)}</td>
                        <td className="py-2 px-3 text-gray-500">{row.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-gray-50">
                      <td colSpan={4} className="py-2 px-4 text-right text-xs font-semibold text-gray-600">Total</td>
                      <td className="py-2 px-3 text-right text-sm font-bold">{totalQty.toFixed(2)} Kg</td>
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
