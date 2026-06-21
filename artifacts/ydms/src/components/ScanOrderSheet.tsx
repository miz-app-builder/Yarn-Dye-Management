import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Camera, Upload, ScanLine, X } from "lucide-react";

export interface ScannedOrderData {
  orderNo?: string;
  orderType?: "Sample" | "Bulk";
  date?: string;
  factoryName?: string;
  jobNo?: string;
  unit?: string;
  colorRows: Array<{
    colorName: string;
    yarnCount: string;
    colorRef: string;
    qtyKg: number;
  }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onData: (data: ScannedOrderData) => void;
}

function toIsoDate(raw: string): string | undefined {
  const parts = raw.trim().split(/[.\-\/]/);
  if (parts.length !== 3) return undefined;
  let [a, b, c] = parts;
  if (c.length === 2) c = "20" + c;
  if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  return undefined;
}

function parseOrderText(text: string): ScannedOrderData {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const full = text;

  let orderType: "Sample" | "Bulk" | undefined;
  if (/sample\s+dy[ei]ing/i.test(full)) orderType = "Sample";
  else if (/bulk\s+dy[ei]ing/i.test(full)) orderType = "Bulk";

  const orderNoMatch = full.match(/order\s*no\.?\s*[:\s]+([A-Za-z0-9\-\/]+)/i);
  const orderNo = orderNoMatch ? orderNoMatch[1].trim() : undefined;

  let date: string | undefined;
  const dateMatch = full.match(/date\s*[:\s]+(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i);
  if (dateMatch) date = toIsoDate(dateMatch[1]);

  let factoryName: string | undefined;
  const toIdx = lines.findIndex((l) => /^to\s*\.?$/i.test(l));
  if (toIdx >= 0 && toIdx + 1 < lines.length) {
    factoryName = lines[toIdx + 1].replace(/\.$/, "").trim();
  }

  const jobMatch = full.match(/job\s*no\.?\s*(?:sample)?\s*[=:]\s*([\w\/\-]+)/i);
  const jobNo = jobMatch ? jobMatch[1].trim() : undefined;

  const unitMatch = full.match(/unit\s*[=:]\s*([^\n]+)/i);
  const unit = unitMatch ? unitMatch[1].trim() : undefined;

  const colorRows: ScannedOrderData["colorRows"] = [];

  const headerIdx = lines.findIndex((l) => /color\s*name/i.test(l));
  const totalIdx = lines.findIndex((l) => /total\s*qty/i.test(l));
  const tableLines =
    headerIdx >= 0
      ? lines.slice(headerIdx + 1, totalIdx > headerIdx ? totalIdx : undefined)
      : [];

  let i = 0;
  while (i < tableLines.length) {
    const line = tableLines[i];

    const fullRowMatch = line.match(
      /^\d+\s+(.+?)\s+(S\/OK|S\/ok|s\/ok)\s+([\d.]+)\s*[Kk]g?/i
    );
    if (fullRowMatch) {
      const colorName = fullRowMatch[1].trim();
      const qtyKg = parseFloat(fullRowMatch[3]);
      let yarnCount = "";
      if (i + 1 < tableLines.length) {
        const next = tableLines[i + 1];
        if (/\d+\/\d+|\d+%|cotton|polyester|nylon|acrylic|viscose|modal|linen/i.test(next) &&
            !/^\d+\s/.test(next) && !/total/i.test(next)) {
          yarnCount = next;
          i++;
        }
      }
      colorRows.push({ colorName, yarnCount, colorRef: "S/OK", qtyKg });
      i++;
      continue;
    }

    const splitRowMatch = line.match(/^(\d+)\s+(.+)/);
    if (splitRowMatch) {
      let rest = splitRowMatch[2];
      const swatchMatch = rest.match(/(S\/OK|s\/ok)/i);
      const qtyMatch = rest.match(/([\d.]+)\s*[Kk]g?/i);
      if (swatchMatch || qtyMatch) {
        const beforeSwatch = swatchMatch
          ? rest.slice(0, rest.toLowerCase().indexOf("s/ok")).trim()
          : rest.replace(/([\d.]+)\s*[Kk]g?.*/i, "").trim();
        const colorName = beforeSwatch || rest.slice(0, 20).trim();
        const qtyKg = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
        let yarnCount = "";
        if (i + 1 < tableLines.length) {
          const next = tableLines[i + 1];
          if (/\d+\/\d+|\d+%|cotton|polyester|nylon|acrylic|viscose|modal|linen/i.test(next) &&
              !/^\d+\s/.test(next) && !/total/i.test(next)) {
            yarnCount = next;
            i++;
          }
        }
        colorRows.push({ colorName, yarnCount, colorRef: "S/OK", qtyKg });
      }
    }
    i++;
  }

  return { orderNo, orderType, date, factoryName, jobNo, unit, colorRows };
}

export function ScanOrderSheet({ open, onClose, onData }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setProgress(0);
    setStatusText("");
  }

  async function runScan() {
    if (!imageUrl) return;
    setScanning(true);
    setProgress(0);
    setStatusText("OCR engine load হচ্ছে…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: any) => {
          if (m.status === "loading tesseract core") setStatusText("Tesseract core load হচ্ছে…");
          else if (m.status === "loading language traineddata") setStatusText("Language model load হচ্ছে…");
          else if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
            setStatusText(`Text recognize হচ্ছে… ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const { data } = await worker.recognize(imageUrl);
      await worker.terminate();
      const parsed = parseOrderText(data.text);
      onData(parsed);
      setImageUrl(null);
      onClose();
    } catch (e) {
      setStatusText("Error হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setScanning(false);
    }
  }

  function handleClose() {
    if (!scanning) {
      setImageUrl(null);
      setProgress(0);
      setStatusText("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-indigo-600" />
            Order Sheet Scan করুন
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!imageUrl ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-6 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Photo Upload</span>
                <span className="text-xs text-gray-400">Gallery থেকে বেছে নিন</span>
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-6 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <Camera className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Camera</span>
                <span className="text-xs text-gray-400">সরাসরি ছবি তুলুন</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="relative">
              <img
                src={imageUrl}
                alt="Order sheet"
                className="w-full max-h-64 object-contain rounded-lg border bg-gray-50"
              />
              {!scanning && (
                <button
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 rounded-full bg-white shadow p-1 hover:bg-red-50"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
          )}

          {scanning && (
            <div className="space-y-2">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-500">{statusText}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={scanning}>
              বাতিল
            </Button>
            <Button
              onClick={runScan}
              disabled={!imageUrl || scanning}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {scanning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning…</>
              ) : (
                <><ScanLine className="h-4 w-4 mr-2" /> Scan করুন</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
