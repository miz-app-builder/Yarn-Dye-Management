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

const NOTE_LINES = [
  "Dyes & Chemicals Should Be Oekotex Standard.",
  "Color Should be as Per Attached Sample",
  "Color fastness to: Dry Rubbing, Wet Rubbing, Water, Perspiration, Light",
  "EU Wash Test",
  "Banned Azo Dyes (NPEO & OPEO)",
  "Formaldehyde JIS L 1041-1983",
  "pH (4.5-7.5)",
  "Phenolic Yellowing",
];

async function exportToPdf(order: any, colorRows: any[], totalQty: number) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const title = `${order.orderType === "Sample" ? "Sample" : "Bulk"} Dyeing Work Order Sheet`;

  // ── Title ──────────────────────────────────────────────────────────────────
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageW / 2, 18, { align: "center" });
  // underline
  const titleW = doc.getTextWidth(title);
  doc.setLineWidth(0.4);
  doc.line(pageW / 2 - titleW / 2, 19.5, pageW / 2 + titleW / 2, 19.5);

  // ── Order No / Date ────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let y = 27;
  doc.text(`Order No:  ${order.orderNo}`, margin, y);
  doc.text(`Date  :  ${order.receiveDate || ""}`, margin, y + 5);

  // ── To / Attn / From ──────────────────────────────────────────────────────
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.text("To", margin, y);
  if (order.buyerName) { y += 5; doc.text(`${order.buyerName}`, margin, y); }
  if ((order as any).customerGarmentsName) { y += 5; doc.text(`${(order as any).customerGarmentsName}`, margin, y); }
  if ((order as any).buyerAddress) { y += 5; doc.text(`${(order as any).buyerAddress}`, margin, y); }
  if ((order as any).attn) { y += 5; doc.text(`Attn: ${(order as any).attn}`, margin, y); }
  if (order.fromPerson) { y += 5; doc.text(`From: ${order.fromPerson}`, margin, y); }

  // ── Color Table ────────────────────────────────────────────────────────────
  y += 7;
  const remarkStr = [
    order.factoryName ? `Factory: ${order.factoryName}` : "",
    order.jobNo ? `Job No: ${order.jobNo}` : "",
    order.unit ? `Unit: ${order.unit}` : "",
  ].filter(Boolean).join("\n");

  autoTable(doc, {
    startY: y,
    head: [["Sl. No", "Color Name", "Color Approval\nSwatch", "Qty. in Kg.", "Remarks"]],
    body: colorRows.map((cr, i) => [
      i + 1,
      `${cr.colorName || ""}${cr.yarnCount ? `\n${cr.yarnCount}` : ""}`,
      cr.colorRef || "S/OK",
      `${Number(cr.qtyKg).toFixed(1)} Kg`,
      cr.remarks ? `${remarkStr}\n${cr.remarks}` : remarkStr,
    ]),
    foot: [["", "", "Total", `${totalQty.toFixed(2)} Kg`, ""]],
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 },
      1: { cellWidth: 48 },
      2: { halign: "center", cellWidth: 32 },
      3: { halign: "center", cellWidth: 24 },
      4: { cellWidth: "auto" as any },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // ── Summary Table (Actual Dye Yarn / Process Loss / Grand Total) ───────────
  if (order.processLossPct != null || order.grandTotalKg != null) {
    const summaryBody: string[][] = [
      ["Actual Dye Yarn Qty", `${totalQty.toFixed(2)} Kg`],
    ];
    if (order.processLossPct != null) {
      summaryBody.push([`Dyeing Process Loss (${Number(order.processLossPct).toFixed(2)}%)`, `${Number(order.processLossKg).toFixed(3)} Kg`]);
    }
    if (order.grandTotalKg != null) {
      summaryBody.push(["Grand Total", `${Number(order.grandTotalKg).toFixed(3)} Kg`]);
    }
    const summaryTableWidth = 80;
    autoTable(doc, {
      startY: y,
      tableWidth: summaryTableWidth,
      margin: { left: pageW - margin - summaryTableWidth, right: margin },
      body: summaryBody,
      theme: "grid",
      bodyStyles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 52 },
        1: { halign: "center", cellWidth: 28 },
      },
      didParseCell: (data) => {
        const isLast = data.row.index === summaryBody.length - 1;
        if (isLast) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [238, 242, 255];
          data.cell.styles.textColor = [55, 48, 163];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    y += 4;
  }

  // ── Note Section ───────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Note:", margin, y);
  const noteLabel = "All Test Requirement.";
  doc.text(noteLabel, margin + 12, y);
  const nlW = doc.getTextWidth(noteLabel);
  doc.setLineWidth(0.3);
  doc.line(margin + 12, y + 1, margin + 12 + nlW, y + 1);

  // "Light Source = D65" box (right side)
  const boxX = pageW - margin - 45;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.rect(boxX, y - 4, 45, 8);
  doc.text("Light Source = D65", boxX + 22.5, y + 0.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;
  NOTE_LINES.forEach((line) => {
    doc.text(`  *  ${line}`, margin + 2, y);
    y += 5;
  });

  // "BUYER = ..." box
  y += 2;
  const buyerBox = `BUYER = ${order.buyerName || ""}`;
  const bbW = Math.max(60, doc.getTextWidth(buyerBox) + 8);
  doc.setLineWidth(0.4);
  doc.rect(margin + 8, y - 4, bbW, 8);
  doc.setFont("helvetica", "bold");
  doc.text(buyerBox, margin + 8 + bbW / 2, y + 0.5, { align: "center" });

  // ── Footer signature line ──────────────────────────────────────────────────
  const footY = pageH - 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const footLabels = ["Received By", "Accountant", "Store Incharge", "Authorised Signature"];
  const footSpacing = (pageW - margin * 2) / (footLabels.length - 1);
  footLabels.forEach((lbl, i) => {
    const x = margin + i * footSpacing;
    doc.line(x - 12, footY, x + 12, footY);
    doc.text(lbl, x, footY + 5, { align: "center" });
  });

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
    ["", "", "", "Total Qty (Actual Dye Yarn)", totalQty, ""],
    ...(order.processLossPct != null ? [["", "", "", `Dyeing Process Loss (${Number(order.processLossPct).toFixed(2)}%)`, Number(order.processLossKg), ""]] : []),
    ...(order.grandTotalKg != null ? [["", "", "", "Grand Total", Number(order.grandTotalKg), ""]] : []),
  ];

  const ws = XLSX.utils.aoa_to_sheet(info);
  ws["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 5 }, { wch: 22 }, { wch: 20 }, { wch: 25 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order");
  XLSX.writeFile(wb, `${order.orderNo}.xlsx`);
}

function printOrder(order: any, colorRows: any[], totalQty: number) {
  const title = `${order.orderType === "Sample" ? "Sample" : "Bulk"} Dyeing Work Order Sheet`;
  const remarkStr = [
    order.factoryName ? `Factory: ${order.factoryName}` : "",
    order.jobNo ? `Job No: ${order.jobNo}` : "",
    order.unit ? `Unit: ${order.unit}` : "",
  ].filter(Boolean).join("<br>");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${order.orderNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 28px 32px; }
        h1 { font-size: 16px; font-weight: bold; text-align: center; text-decoration: underline; margin-bottom: 14px; }
        .top-info { margin-bottom: 4px; }
        .top-info p { margin-bottom: 3px; }
        .to-section { margin: 10px 0 8px 0; }
        .to-section p { margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0 14px 0; }
        th { border: 1px solid #000; padding: 5px 7px; text-align: center; font-size: 10px; font-weight: bold; background: #fff; }
        td { border: 1px solid #000; padding: 5px 7px; font-size: 10px; vertical-align: top; }
        td.center { text-align: center; }
        tfoot td { font-weight: bold; text-align: center; }
        .note-section { margin-top: 6px; }
        .note-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
        .note-title { font-weight: bold; font-size: 11px; }
        .note-title u { text-decoration: underline; }
        .light-box { border: 1.5px solid #000; padding: 4px 10px; font-weight: bold; font-size: 11px; }
        .note-list { list-style: none; padding: 0; margin: 0 0 8px 8px; }
        .note-list li { margin-bottom: 3px; }
        .note-list li::before { content: "* "; font-weight: bold; }
        .buyer-box { display: inline-block; border: 1.5px solid #000; padding: 4px 14px; font-weight: bold; font-size: 11px; margin: 4px 0 0 8px; }
        .footer { display: flex; justify-content: space-between; margin-top: 40px; }
        .footer-item { text-align: center; min-width: 100px; }
        .footer-item .line { border-top: 1px solid #000; margin-bottom: 4px; }
        @media print {
          body { padding: 14px 18px; }
          @page { margin: 10mm; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>

      <div class="top-info">
        <p>Order No:&nbsp; ${order.orderNo}</p>
        <p>Date &nbsp;&nbsp;&nbsp;:&nbsp; ${order.receiveDate || ""}</p>
      </div>

      <div class="to-section">
        <p>To</p>
        ${order.buyerName ? `<p>${order.buyerName}</p>` : ""}
        ${order.customerGarmentsName ? `<p>${order.customerGarmentsName}</p>` : ""}
        ${order.buyerAddress ? `<p>${order.buyerAddress}</p>` : ""}
        ${order.attn ? `<p>Attn: ${order.attn}</p>` : ""}
        ${order.fromPerson ? `<p>From: ${order.fromPerson}</p>` : ""}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:36px">Sl. No</th>
            <th>Color Name</th>
            <th>Color Approval Swatch</th>
            <th style="width:80px">Qty. in Kg.</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${colorRows.map((cr, i) => `
            <tr>
              <td class="center">${i + 1}</td>
              <td>${cr.colorName || ""}${cr.yarnCount ? `<br><span style="font-size:9px;color:#333">${cr.yarnCount}</span>` : ""}</td>
              <td class="center">${cr.colorRef || "S/OK"}</td>
              <td class="center">${Number(cr.qtyKg).toFixed(1)} Kg</td>
              <td style="font-size:9.5px">${remarkStr}${cr.remarks ? `<br>${cr.remarks}` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align:right;font-weight:bold">Total</td>
            <td class="center">${totalQty.toFixed(2)} Kg</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      ${(order.processLossPct != null || order.grandTotalKg != null) ? `
      <table style="width:auto;margin-left:auto;margin-bottom:12px;border-collapse:collapse;">
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:4px 10px;font-size:10px;font-weight:bold;">Actual Dye Yarn Qty</td>
            <td style="border:1px solid #000;padding:4px 10px;font-size:10px;text-align:center;min-width:80px;">${totalQty.toFixed(2)} Kg</td>
          </tr>
          ${order.processLossPct != null ? `
          <tr>
            <td style="border:1px solid #000;padding:4px 10px;font-size:10px;font-weight:bold;">Dyeing Process Loss (${Number(order.processLossPct).toFixed(2)}%)</td>
            <td style="border:1px solid #000;padding:4px 10px;font-size:10px;text-align:center;">${Number(order.processLossKg).toFixed(3)} Kg</td>
          </tr>` : ""}
          ${order.grandTotalKg != null ? `
          <tr style="background:#eef2ff;">
            <td style="border:1px solid #000;padding:4px 10px;font-size:10px;font-weight:bold;color:#3730a3;">Grand Total</td>
            <td style="border:1px solid #000;padding:4px 10px;font-size:10px;text-align:center;font-weight:bold;color:#3730a3;">${Number(order.grandTotalKg).toFixed(3)} Kg</td>
          </tr>` : ""}
        </tbody>
      </table>` : ""}

      <div class="note-section">
        <div class="note-header">
          <span class="note-title">Note:&nbsp; <u>All Test Requirement.</u></span>
          <span class="light-box">Light Source = D65</span>
        </div>
        <ul class="note-list">
          <li>Dyes &amp; Chemicals Should Be Oekotex Standard.</li>
          <li>Color Should be as Per Attached Sample</li>
          <li>Color fastness to:
            <ul style="list-style:none;padding-left:16px;margin-top:2px">
              <li>* Dry Rubbing</li>
              <li>* Wet Rubbing</li>
              <li>* Water</li>
              <li>* Perspiration</li>
              <li>* Light</li>
            </ul>
          </li>
          <li>EU Wash Test</li>
          <li>Banned Azo Dyes (NPEO &amp; OPEO)</li>
          <li>Formaldehyde JIS L 1041-1983</li>
          <li>pH (4.5-7.5)</li>
          <li>Phenolic Yellowing</li>
        </ul>
        <div class="buyer-box">BUYER = ${order.buyerName || ""}</div>
      </div>

      <div class="footer">
        <div class="footer-item"><div class="line"></div>Received By</div>
        <div class="footer-item"><div class="line"></div>Accountant</div>
        <div class="footer-item"><div class="line"></div>Store Incharge</div>
        <div class="footer-item"><div class="line"></div>Authorised Signature</div>
      </div>
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
              {(order as any).processLossPct != null && (
                <div><p className="text-xs text-gray-500 mb-1">Dyeing Process Loss %</p><p className="font-medium text-sm text-amber-700">{Number((order as any).processLossPct).toFixed(2)}%</p></div>
              )}
              {(order as any).processLossKg != null && (
                <div><p className="text-xs text-gray-500 mb-1">Process Loss Qty</p><p className="font-medium text-sm text-amber-700">{Number((order as any).processLossKg).toFixed(3)} Kg</p></div>
              )}
              {(order as any).grandTotalKg != null && (
                <div><p className="text-xs text-gray-500 mb-1">Grand Total</p><p className="font-medium text-sm text-indigo-700">{Number((order as any).grandTotalKg).toFixed(3)} Kg</p></div>
              )}
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
