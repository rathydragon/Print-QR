/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { QRCodeItem, ImportFieldMapping } from '../types';

interface ExcelImporterProps {
  onImport: (items: Array<Omit<QRCodeItem, 'id' | 'createdAt' | 'printedCount'>>) => void;
}

export default function ExcelImporter({ onImport }: ExcelImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheetColumns, setSheetColumns] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<ImportFieldMapping>({
    code: '',
    name: '',
    price: '',
    category: '',
    notes: '',
  });
  const [previewItems, setPreviewItems] = useState<Array<Omit<QRCodeItem, 'id' | 'createdAt' | 'printedCount'>>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detection rules for columns (Fuzzy match English/Khmer)
  const autoDetectColumn = (columns: string[], keys: string[]): string => {
    const lowercaseCols = columns.map(c => String(c).toLowerCase().trim());
    for (const key of keys) {
      const matchIndex = lowercaseCols.findIndex(col => col.includes(key));
      if (matchIndex !== -1) {
        return columns[matchIndex];
      }
    }
    return '';
  };

  const handleFile = (file: File) => {
    if (!file) return;
    
    // Check extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
      setErrorMsg('សូមជ្រើសរើសតែឯកសារ Excel (.xlsx, .xls) ឬ CSV (.csv)');
      return;
    }

    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
        
        if (jsonData.length === 0) {
          setErrorMsg('ឯកសារ Excel នេះគ្មានទិន្នន័យទេ! សូមពិនិត្យឡើងវិញ។');
          return;
        }

        // Get headers
        const headers = Object.keys(jsonData[0]);
        setSheetColumns(headers);
        setParsedData(jsonData);

        // Smart Mapping - only detect code
        const codeCol = autoDetectColumn(headers, ['code', 'id', 'sku', 'barcode', 'qr', 'កូដ', 'លេខកូដ', 'ល.រ']);

        const initialMapping: ImportFieldMapping = {
          code: codeCol || headers[0] || '',
          name: '',
          price: '',
          category: '',
          notes: '',
        };

        setMapping(initialMapping);
        generatePreview(jsonData, initialMapping);
      } catch (err) {
        setErrorMsg('មានបញ្ហាក្នុងការអានឯកសារ Excel ។ សូមប្រាកដថាឯកសារមិនខូច។');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const generatePreview = (data: any[], currentMapping: ImportFieldMapping) => {
    if (!currentMapping.code) {
      setPreviewItems([]);
      return;
    }

    const items = data.map((row) => {
      const codeVal = String(row[currentMapping.code] || '').trim();
      const nameVal = codeVal; // Use code as display label (Name)

      return {
        code: codeVal,
        name: nameVal,
        price: '',
        category: '',
        notes: '',
      };
    }).filter(item => item.code); // Filter empty values

    setPreviewItems(items);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleMappingChange = (field: keyof ImportFieldMapping, value: string) => {
    const updated = { ...mapping, [field]: value };
    setMapping(updated);
    generatePreview(parsedData, updated);
  };

  const triggerImport = () => {
    if (previewItems.length === 0) return;
    onImport(previewItems);
    resetImporter();
  };

  const resetImporter = () => {
    setFileName(null);
    setSheetColumns([]);
    setParsedData([]);
    setPreviewItems([]);
    setMapping({ code: '', name: '', price: '', category: '', notes: '' });
  };

  return (
    <div id="excel-importer-root" className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            នាំចូលទិន្នន័យពី Excel / CSV
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            អូសទម្លាក់ ឬជ្រើសរើសឯកសារបញ្ជីផលិតផល ដើម្បីបង្កើត QR Code ជាក្រុមយ៉ាងរហ័ស
          </p>
        </div>
        {fileName && (
          <button 
            id="btn-excel-reset"
            onClick={resetImporter}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            ប្ដូរឯកសារថ្មី
          </button>
        )}
      </div>

      {errorMsg && (
        <div id="importer-error" className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {!fileName ? (
        <div 
          id="drop-zone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragActive 
              ? 'border-emerald-500 bg-emerald-50/40 scale-[0.99]' 
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <Upload className="w-7 h-7" />
          </div>
          <span className="text-slate-700 font-semibold mb-1">
            ជ្រើសរើសឯកសារ ឬអូសទម្លាក់ទីនេះ
          </span>
          <span className="text-xs text-slate-400">
            គាំទ្រទម្រង់ .xlsx, .xls, .csv (ទំហំរហូតដល់ 10MB)
          </span>
        </div>
      ) : (
        <div id="mapping-and-preview" className="space-y-6">
          {/* File summary */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-800 truncate">{fileName}</h4>
              <p className="text-xs text-slate-500">{parsedData.length} ជួរដេកត្រូវបានរកឃើញ</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              <Check className="w-3.5 h-3.5" /> រួចរាល់
            </span>
          </div>

          {/* Configuration Mapping Panel */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full">1</span>
              ភ្ជាប់ជួរឈរទិន្នន័យ (Column Mapping)
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  កូដសម្គាល់ផលិតផល/QR * (Code)
                </label>
                <select 
                  value={mapping.code}
                  onChange={(e) => handleMappingChange('code', e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                >
                  <option value="">-- ជ្រើសរើសជួរឈរ --</option>
                  {sheetColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Import Preview Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full">2</span>
                មើលគំរូទិន្នន័យផលិតផលដែលត្រៀមបញ្ចូល ({previewItems.length})
              </h3>
            </div>
            <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-100 z-10">
                    <th className="px-4 py-2.5">កូដសម្គាល់/Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {previewItems.slice(0, 100).map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-800">{row.code}</td>
                    </tr>
                  ))}
                  {previewItems.length > 100 && (
                    <tr>
                      <td className="px-4 py-3 bg-slate-50/80 text-center text-xs text-slate-500 font-medium">
                        និងមានគំរូផលិតផលចំនួន {previewItems.length - 100} ផ្សេងទៀតដែលមានក្នុងបញ្ជី...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Execution Button */}
          <div className="flex justify-end pt-2">
            <button
              id="btn-confirm-import"
              onClick={triggerImport}
              disabled={previewItems.length === 0}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/10 active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4" />
              យល់ព្រម និងបញ្ចូលទិន្នន័យទាំង {previewItems.length} ផលិតផល
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
