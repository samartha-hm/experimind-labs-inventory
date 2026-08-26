import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Download,
  Check,
  FileText
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setErrors([]);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(uploadedFile);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      setErrors(['CSV file must contain a header row and at least one data row.']);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];
    const validationErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      if (currentline.length === headers.length) {
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = currentline[j];
        }
        
        // Basic Pre-validation
        const name = obj.name || obj['Item Name'] || obj['Product Name'];
        if (!name) {
          validationErrors.push(`Row ${i}: Missing item name`);
        }
        rows.push(obj);
      }
    }

    setParsedRows(rows);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
    }
  };

  const handleDownloadSample = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      'SKU,Item Name,Category,Quantity,Unit Cost,Bin,UOM\n' +
      'ESP32-WROOM-32,ESP32 Wi-Fi & Bluetooth MCU Module,Microcontrollers,50,350.00,Rack - Shelf 1,pcs\n' +
      'SHT31-DIS-F,Digital Temperature & Humidity Sensor,Sensors,25,180.00,Rack - Shelf 2,pcs\n' +
      'OLED-128X64-I2C,0.96 inch I2C OLED Display Module,Displays,40,220.00,Rack - Shelf 3,pcs\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'nexainventory_sample_catalog.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    try {
      setImporting(true);
      setErrors([]);
      const res = await apiFetch('/api/v1/bulk-import/items', {
        method: 'POST',
        body: JSON.stringify({ rows: parsedRows })
      });

      setSuccessMsg(res.message || `Imported ${parsedRows.length} items.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (e: any) {
      setErrors([e.message]);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-scale-up space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-700/50">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Universal CSV Bulk Catalog Importer</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Batch import products, initial on-hand stock balances, unit costs, and shelf bin assignments in one atomic transaction.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Error Alerts */}
        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {errors.length > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-300 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Validation Warnings:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 max-h-24 overflow-y-auto">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload Zone */}
        {parsedRows.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-750 hover:border-indigo-500/60 rounded-2xl p-8 text-center transition-colors bg-slate-50 dark:bg-slate-950/50 flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Drag and drop your CSV spreadsheet here, or <label className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">browse file<input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" /></label>
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports standard CSV format with headers (SKU, Item Name, Quantity, Unit Cost, Bin).</p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold pt-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template CSV Schema (.csv)
            </button>
          </div>
        ) : (
          /* Preview Grid */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Parsed {parsedRows.length} Rows from <span className="font-mono text-indigo-600 dark:text-indigo-400">{file?.name}</span>
              </span>
              <button
                onClick={() => {
                  setParsedRows([]);
                  setFile(null);
                  setErrors([]);
                }}
                className="text-slate-500 hover:text-red-500 text-xs cursor-pointer"
              >
                Clear / Re-upload
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-900 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Unit Cost</th>
                    <th className="py-2.5 px-3">Shelf Bin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-850">
                  {parsedRows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-100 dark:hover:bg-slate-900/60 font-mono text-[11px]">
                      <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">{r.SKU || r.sku || '-'}</td>
                      <td className="py-2 px-3 font-sans text-slate-900 dark:text-slate-200 font-medium">{r['Item Name'] || r.name || '-'}</td>
                      <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{r.Quantity || r.stock_qty || '0'}</td>
                      <td className="py-2 px-3 font-semibold">₹{Number(r['Unit Cost'] || r.unit_price || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{r.Bin || r.bin || 'Default'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 50 && (
              <p className="text-[11px] text-slate-500 text-right">Showing first 50 rows of {parsedRows.length} total.</p>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsedRows.length === 0 || importing}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {importing && <RefreshCw className="w-4 h-4 animate-spin" />}
            {importing ? 'Processing Batch Import...' : `Commit Import (${parsedRows.length} Items)`}
          </button>
        </div>
      </div>
    </div>
  );
};
