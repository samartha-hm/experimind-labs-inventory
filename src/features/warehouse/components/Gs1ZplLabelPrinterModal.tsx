import React, { useState, useEffect } from "react";
import { Printer, Copy, Check, QrCode, Tag } from "lucide-react";

interface Gs1ZplLabelPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  sku: string;
}

export const Gs1ZplLabelPrinterModal: React.FC<Gs1ZplLabelPrinterModalProps> = ({
  isOpen,
  onClose,
  itemId,
  itemName,
  sku,
}) => {
  const [zplCode, setZplCode] = useState<string>("");
  const [barcodeValue, setBarcodeValue] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && itemId) {
      fetchLabel();
    }
  }, [isOpen, itemId]);

  const fetchLabel = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/v1/inventory/${itemId}/zpl`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setZplCode(data.zpl || "");
      setBarcodeValue(data.barcodeValue || sku);
    } catch (e) {
      console.error("Failed to load ZPL:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(zplCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintViaBrowser = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Industrial Barcode Label (Zebra ZPL-II)</h3>
              <p className="text-xs text-slate-400">GS1-128 Compliant Direct Thermal / Thermal Transfer Code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 rounded-lg"
          >
            Close
          </button>
        </div>

        {/* Visual Preview Badge */}
        <div className="p-4 bg-white text-black rounded-xl border border-slate-300 shadow-inner flex flex-col items-center justify-center text-center space-y-2">
          <div className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Experimind Labs Asset Label</div>
          <div className="text-sm font-black tracking-tight">{itemName}</div>
          <div className="text-xs font-mono font-bold text-slate-800">SKU: {sku}</div>
          
          {/* Simulated 1D Barcode Graphic */}
          <div className="w-64 h-12 bg-slate-950 flex items-center justify-around px-2 py-1 rounded">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="bg-white h-full"
                style={{ width: i % 3 === 0 ? "3px" : i % 2 === 0 ? "1px" : "2px" }}
              />
            ))}
          </div>
          <div className="text-[11px] font-mono tracking-wider font-semibold text-slate-700">{barcodeValue}</div>
          <div className="text-[9px] text-slate-500 tracking-tight uppercase">GMP / ISO 13485 TRACKED ASSET - AUTHORIZED USE ONLY</div>
        </div>

        {/* Raw ZPL Output Box */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> Zebra ZPL-II Programming Code (203 DPI)
            </span>
            <button
              onClick={handleCopy}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy ZPL"}
            </button>
          </div>
          <textarea
            readOnly
            value={zplCode}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-emerald-400 h-28 resize-none focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Done
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition"
          >
            <Copy className="w-4 h-4" /> Copy to Zebra NetPrint
          </button>
          <button
            type="button"
            onClick={handlePrintViaBrowser}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" /> Print Label
          </button>
        </div>
      </div>
    </div>
  );
};
