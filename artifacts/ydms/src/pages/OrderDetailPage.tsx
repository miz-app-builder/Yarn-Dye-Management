import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetOrder, useListOrderPhotos, useUpdateOrderStatus,
  useAddOrderPhoto, useDeleteOrderPhoto, getGetOrderQueryKey,
  getListOrderPhotosQueryKey, useDeleteOrder, useRequestUploadUrl
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Upload, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUSES = ["Received", "Lab Dip", "Dyeing Running", "Finishing", "Ready", "Delivered"];
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

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) }
  });
  const { data: photos, isLoading: loadingPhotos } = useListOrderPhotos(orderId, {
    query: { enabled: !!orderId, queryKey: getListOrderPhotosQueryKey(orderId) }
  });

  const updateStatus = useUpdateOrderStatus();
  const addPhoto = useAddOrderPhoto();
  const deletePhoto = useDeleteOrderPhoto();
  const deleteOrder = useDeleteOrder();
  const requestUpload = useRequestUploadUrl();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [photoType, setPhotoType] = useState("Yarn Photo");
  const [uploading, setUploading] = useState(false);

  if (isLoading) return <div className="space-y-4 p-8"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  if (!order) return <div>Order not found</div>;

  const currentStatusIndex = STATUSES.indexOf(order.status);
  const canAdvance = currentStatusIndex < STATUSES.length - 1;

  const handleAdvanceStatus = () => {
    if (canAdvance) {
      setNextStatus(STATUSES[currentStatusIndex + 1]);
      setStatusRemarks("");
      setStatusDialogOpen(true);
    }
  };

  const submitStatusUpdate = () => {
    updateStatus.mutate({ id: orderId, data: { status: nextStatus as any, remarks: statusRemarks } }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
        setStatusDialogOpen(false);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadRes = await requestUpload.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type }
      });

      await fetch(uploadRes.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      await addPhoto.mutateAsync({
        id: orderId,
        data: { photoType: photoType as any, photoUrl: uploadRes.objectPath }
      });

      toast({ title: "Photo uploaded" });
      queryClient.invalidateQueries({ queryKey: getListOrderPhotosQueryKey(orderId) });
      setUploadDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{order.orderNo}</h1>
              <Badge className={STATUS_COLORS[order.status] || ""}>{order.status}</Badge>
              <Badge variant="outline">{order.orderType}</Badge>
            </div>
            <p className="text-gray-500 mt-1">{order.buyerName} • {order.factoryName || "—"}</p>
          </div>
        </div>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => {
          if (confirm("Are you sure you want to delete this order?")) {
            deleteOrder.mutate({ id: orderId }, {
              onSuccess: () => setLocation("/orders")
            });
          }
        }}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
              <div><p className="text-sm text-gray-500 mb-1">Yarn Type</p><p className="font-medium">{order.yarnType}</p></div>
              <div><p className="text-sm text-gray-500 mb-1">Color</p><p className="font-medium">{order.color}</p></div>
              <div><p className="text-sm text-gray-500 mb-1">Quantity</p><p className="font-medium">{order.quantityKg} KG</p></div>
              <div><p className="text-sm text-gray-500 mb-1">Receive Date</p><p className="font-medium">{new Date(order.receiveDate).toLocaleDateString()}</p></div>
              <div><p className="text-sm text-gray-500 mb-1">Delivery Date</p><p className="font-medium">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-sm text-gray-500 mb-1">Factory</p><p className="font-medium">{order.factoryName || "—"}</p></div>
              <div className="col-span-2 md:col-span-3"><p className="text-sm text-gray-500 mb-1">Remarks</p><p className="text-gray-700">{order.remarks || "—"}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle>Status Workflow</CardTitle>
              {canAdvance && (
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleAdvanceStatus}>
                  Advance to {STATUSES[currentStatusIndex + 1]}
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 z-0" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 z-0 transition-all"
                  style={{ width: `${(currentStatusIndex / (STATUSES.length - 1)) * 100}%` }} />
                {STATUSES.map((s, idx) => (
                  <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${idx <= currentStatusIndex ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-300 text-gray-300"}`}>
                      {idx < currentStatusIndex ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-xs font-medium text-center max-w-[56px] ${idx <= currentStatusIndex ? "text-gray-900" : "text-gray-400"}`}>{s}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900">History</h4>
                {order.statusHistory?.map((h: any) => (
                  <div key={h.id} className="flex gap-4 text-sm">
                    <div className="w-32 shrink-0 text-gray-500">{new Date(h.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                    <div>
                      <span className="font-medium">{h.status}</span>
                      {h.remarks && <span className="text-gray-500 ml-2">— {h.remarks}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle>Documents & Photos</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" /> Upload
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {loadingPhotos ? <Skeleton className="h-24 w-full" /> : !photos?.length ? (
                <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">No photos uploaded</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((p: any) => (
                    <div key={p.id} className="relative group border rounded-lg overflow-hidden bg-gray-50 aspect-square flex flex-col">
                      <img src={`/api/storage/${p.photoUrl}`} alt={p.photoType} className="flex-1 object-cover w-full h-full" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a href={`/api/storage/${p.photoUrl}`} target="_blank" rel="noreferrer" className="p-2 bg-white/20 rounded-full hover:bg-white/40 text-white">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button onClick={() => {
                          if (confirm("Delete photo?")) deletePhoto.mutate({ id: orderId, photoId: p.id }, {
                            onSuccess: () => queryClient.invalidateQueries({ queryKey: getListOrderPhotosQueryKey(orderId) })
                          });
                        }} className="p-2 bg-red-500/80 rounded-full hover:bg-red-500 text-white">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-2 py-1 truncate">{p.photoType}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Advance to {nextStatus}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks (Optional)</label>
              <Textarea value={statusRemarks} onChange={e => setStatusRemarks(e.target.value)} placeholder="Add a note for this status change..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitStatusUpdate} disabled={updateStatus.isPending} className="bg-indigo-600">
              {updateStatus.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document / Photo</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type</label>
              <Select value={photoType} onValueChange={setPhotoType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Challan", "Yarn Photo", "Shade Card", "Delivery Evidence"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select File</label>
              <Input type="file" onChange={handleFileUpload} disabled={uploading} accept="image/*,.pdf" />
              {uploading && <p className="text-sm text-indigo-600 flex items-center mt-2"><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Uploading...</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
