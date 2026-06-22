/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, Settings, Eye, Sliders, Type, LayoutGrid, Palette, AlertCircle, ExternalLink } from 'lucide-react';
import { QRCodeItem, PrintSetup } from '../types';

interface PrintGridProps {
  selectedItems: QRCodeItem[];
  onPrintSaved: (ids: string[]) => Promise<void>;
}

export default function PrintGrid({ selectedItems, onPrintSaved }: PrintGridProps) {
  const [setup, setSetup] = useState<PrintSetup>({
    qrSize: 110,
    layoutCols: 4,
    showLabel: true,
    showCode: true,
    showPrice: true,
    badgeWidth: '45mm',
    badgeHeight: '35mm',
    fontSize: 12,
    spacing: 12,
    colorDark: '#000000',
    colorLight: '#ffffff',
  });

  const [showSystemPrint, setShowSystemPrint] = useState(true);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [printError, setPrintError] = useState<boolean>(false);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Detect if running inside an iframe
  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  // Generate QR Images dynamically based on config
  useEffect(() => {
    let active = true;
    async function generateCodes() {
      setIsGenerating(true);
      const urls: Record<string, string> = {};
      for (const item of selectedItems) {
        try {
          const url = await QRCode.toDataURL(item.code, {
            width: setup.qrSize * 2, // Double resolution for clean physical printing
            margin: 1,
            color: {
              dark: setup.colorDark || '#000000',
              light: setup.colorLight || '#ffffff',
            },
          });
          urls[item.id] = url;
        } catch (err) {
          console.error('Error rendering high-res QR Code', err);
        }
      }
      if (active) {
        setQrUrls(urls);
        setIsGenerating(false);
      }
    }
    
    if (selectedItems.length > 0) {
      generateCodes();
    }
    return () => { active = false; };
  }, [selectedItems, setup.qrSize, setup.colorDark, setup.colorLight]);

  const handlePrint = async () => {
    if (selectedItems.length === 0) return;
    
    setPrintError(false);

    if (showSystemPrint) {
      try {
        // Call browser's native printer immediately (synchronously)
        // to avoid modern browser security blocks on asynchronous actions
        window.print();
      } catch (err) {
        console.error('Print failed or blocked by iframe restrictions:', err);
        setPrintError(true);
      }
    } else {
      // Show success toast for bypassed system print
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
    }

    // Trigger onPrintSaved callback asynchronously to increment print counters in the database
    const printedIds = selectedItems.map(item => item.id);
    try {
      await onPrintSaved(printedIds);
    } catch (err) {
      console.error('Error saving print counts:', err);
    }
  };

  if (selectedItems.length === 0) {
    return (
      <div id="print-empty-state" className="bg-white border border-slate-100 rounded-3xl p-10 select-none text-center">
        <Printer className="w-12 h-12 text-slate-300 stroke-[1.5] mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-700">រៀបចំ និងមើលគំរូបោះពុម្ព QR Code</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          សូមជ្រើសរើស (Check) ផលិតផលពីបញ្ជីខាងលើ ដើម្បីដំណើរការរចនាទម្រង់ ព្រីន និងទស្សនាគំរូសន្លឹកបោះពុម្ព
        </p>
      </div>
    );
  }

  return (
    <div id="print-grid-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Configuration Sidebar */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 lg:col-span-1 no-print">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
          <Settings className="w-5 h-5 text-brand-600" />
          <h3 className="font-bold text-slate-800">ការកំណត់ទម្រង់បោះពុម្ព</h3>
        </div>

        {/* Form controls */}
        <div className="space-y-4 text-xs font-medium text-slate-600">
          {/* Columns */}
          <div>
            <label className="flex items-center gap-1.5 text-slate-500 mb-1.5 font-bold">
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              ចំនួនជួរឈរក្នុងមួយសន្លឹក (Grid Columns)
            </label>
            <div className="grid grid-cols-6 gap-1">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSetup(s => ({ ...s, layoutCols: num }))}
                  className={`py-1.5 font-bold rounded-lg transition-all text-center ${
                    setup.layoutCols === num 
                      ? 'bg-brand-600 text-white shadow-sm' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                  }`}
                >
                  {num} ខ្ទង់
                </button>
              ))}
            </div>
          </div>

          {/* Sizing & Spacing */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-700 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              ទំហំ QR និងចន្លោះ (Sizing)
            </h4>
            
            <div>
              <div className="flex justify-between mb-1">
                <span>ទំហំ QR Code ({setup.qrSize}px)</span>
              </div>
              <input
                type="range"
                min="60"
                max="200"
                value={setup.qrSize}
                onChange={(e) => setSetup(s => ({ ...s, qrSize: parseInt(e.target.value) }))}
                className="w-full accent-brand-600 h-1.5 bg-slate-100 rounded-lg cursor-ew-resize"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>ចន្លោះឃ្លាតស្លាកសញ្ញា ({setup.spacing}px)</span>
              </div>
              <input
                type="range"
                min="4"
                max="32"
                value={setup.spacing}
                onChange={(e) => setSetup(s => ({ ...s, spacing: parseInt(e.target.value) }))}
                className="w-full accent-brand-600 h-1.5 bg-slate-100 rounded-lg cursor-ew-resize"
              />
            </div>
          </div>

          {/* Visibility checks */}
          <div className="space-y-3 pt-2 border-t border-slate-50">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              ការបង្ហាញព័ត៌មានលើស្លាក (Fields Display)
            </h4>

            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={setup.showLabel}
                onChange={(e) => setSetup(s => ({ ...s, showLabel: e.target.checked }))}
                className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
              />
              <span>បង្ហាញឈ្មោះផលិតផល (Name)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={setup.showCode}
                onChange={(e) => setSetup(s => ({ ...s, showCode: e.target.checked }))}
                className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
              />
              <span>បង្ហាញកូដផលិតផល (Code Text)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={setup.showPrice}
                onChange={(e) => setSetup(s => ({ ...s, showPrice: e.target.checked }))}
                className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
              />
              <span>បង្ហាញតម្លៃផលិតផល (Price Tag)</span>
            </label>
          </div>

          {/* Label physical print dimension settings */}
          <div className="space-y-3 pt-2 border-t border-slate-50">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              ទំហំអក្សរ និងរាងស្លាក (Dimension)
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">ទទឹងកាត (Width)</label>
                <input
                  type="text"
                  value={setup.badgeWidth}
                  onChange={(e) => setSetup(s => ({ ...s, badgeWidth: e.target.value }))}
                  placeholder="e.g. 45mm"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">កម្ពស់កាត (Height)</label>
                <input
                  type="text"
                  value={setup.badgeHeight}
                  onChange={(e) => setSetup(s => ({ ...s, badgeHeight: e.target.value }))}
                  placeholder="e.g. 35mm"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>ទំហំអក្សរព័ត៌មាន (Font Size: {setup.fontSize}px)</span>
              </div>
              <input
                type="range"
                min="8"
                max="20"
                value={setup.fontSize}
                onChange={(e) => setSetup(s => ({ ...s, fontSize: parseInt(e.target.value) }))}
                className="w-full accent-brand-600 h-1.5 bg-slate-100 rounded-lg"
              />
            </div>
          </div>

          {/* Color customizations */}
          <div className="space-y-3 pt-2 border-t border-slate-50">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              កម្រងពណ៌ QR Code (Colors)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">ពណ៌កូដខ្មៅ / QR Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={setup.colorDark}
                    onChange={(e) => setSetup(s => ({ ...s, colorDark: e.target.value }))}
                    className="w-7 h-7 p-0 border border-slate-200 rounded-md cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={setup.colorDark}
                    onChange={(e) => setSetup(s => ({ ...s, colorDark: e.target.value }))}
                    className="w-full text-[10px] font-mono p-1 bg-slate-50 border border-slate-200 rounded" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">ពណ៌លម្អក្រោយ / Background</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={setup.colorLight}
                    onChange={(e) => setSetup(s => ({ ...s, colorLight: e.target.value }))}
                    className="w-7 h-7 p-0 border border-slate-200 rounded-md cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={setup.colorLight}
                    onChange={(e) => setSetup(s => ({ ...s, colorLight: e.target.value }))}
                    className="w-full text-[10px] font-mono p-1 bg-slate-50 border border-slate-200 rounded" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle System Print Dialog */}
        <div className="p-3.5 bg-slate-50/70 border border-slate-200/50 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="toggle-system-print" className="font-bold text-slate-700 text-xs flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-4 h-4 text-slate-400" />
              បើកផ្ទាំងព្រីនរបស់ប្រព័ន្ធ (System Print)
            </label>
            <p className="text-[10px] text-slate-400 leading-normal">
              បង្ហាញផ្ទាំងជ្រើសរើសម៉ាស៊ីនព្រីនកុំព្យូទ័រ
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              id="toggle-system-print"
              type="checkbox"
              checked={showSystemPrint}
              onChange={(e) => setShowSystemPrint(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {/* Print call-to-action */}
        <div className="pt-4 space-y-3.5">
          {/* Printer status card based on selection */}
          {showSystemPrint ? (
            <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-[11px] uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                ការភ្ជាប់ជាមួយម៉ាស៊ីនព្រីនកុំព្យូទ័រ
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                នៅពេលលោកអ្នកចុចប៊ូតុង <strong>«បោះពុម្ពឥឡូវនេះ»</strong> ប្រព័ន្ធនឹងបើកផ្ទាំង <strong>Standard System Print Dialog</strong> នៃកម្មវិធីរុករក (Browser) ដោយស្វ័យប្រវត្ត។ នៅទីនោះ លោកអ្នកអាចជ្រើសរើសម៉ាស៊ីនព្រីនដែលមានស្រាប់នៅលើកុំព្យូទ័ររបស់លោកអ្នកផ្ទាល់ (ដូចជា <span className="font-semibold text-slate-700">Xprinter, Canon, HP, Epson</span>) នៅក្នុងប្រឡោះ <strong className="text-brand-600">"Destination"</strong>។
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-[11px] uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                សន្សំសំចៃ៖ កត់ត្រាស្ថិតិបោះពុម្ពដោយផ្ទាល់
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                ផ្ទាំង System Print Dialog នឹងត្រូវបាន <strong>លាក់/មិនបង្ហាញឡើយ</strong>។ នៅពេលលោកអ្នកចុចប៊ូតុង <strong>«បោះពុម្ពឥឡូវនេះ»</strong> ប្រព័ន្ធនឹងកត់ត្រាការបោះពុម្ព និងបង្កើនស្ថិតិបោះពុម្ពទៅក្នុងប្រព័ន្ធទិន្នន័យដោយជោគជ័យភ្លាមៗ!
              </p>
            </div>
          )}

          <button
            id="btn-print-action"
            onClick={handlePrint}
            disabled={isGenerating}
            className="w-full px-5 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Printer className="w-4.5 h-4.5" />
            បោះពុម្ពឥឡូវនេះ (ព្រីន {selectedItems.length} ប័ណ្ណ)
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
            * គាំទ្រការបោះពុម្ពលើក្រដាស A4 ឬក្រដាសស្ទីគ័រ Sticker បកបិទបានល្អ
          </p>

          {/* Iframe detection notice */}
          {isInIframe && (
            <div className="p-3.5 bg-amber-50 border border-amber-200/60 rounded-2xl space-y-1.5 mt-2 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-[10px] uppercase tracking-wide">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                បញ្ជាក់សម្រាប់ការបោះពុម្ពលើផ្ទាំង Preview
              </div>
              <p className="text-[11px] text-amber-700 leading-normal">
                ដោយសារលោកអ្នកកំពុងប្រើប្រាស់នៅក្នុងផ្ទាំង Preview របស់ AI Studio (iFrame) <strong>មុខងារព្រីនផ្ទាល់របស់កុំព្យូទ័រអាចនឹងត្រូវបាន Browser ទប់ស្កាត់</strong>។ 
                សូមចុចលើប៊ូតុង <strong>「Open App in New Tab」</strong> (បើកក្នុង Tab ថ្មី) នៅខាងលើបង្អស់ផ្នែកខាងស្តាំ ដើម្បីប្រើប្រាស់មុខងារព្រីនបានជោគជ័យ ១០០%!
              </p>
            </div>
          )}

          {printError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5 mt-2 shadow-sm animate-in shake duration-300">
              <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-[10px] uppercase tracking-wide">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                ការបោះពុម្ពត្រូវបានរារាំង (Print Blocked)
              </div>
              <p className="text-[11px] text-rose-700 leading-normal font-medium">
                កម្មវិធីរុករក (Browser) របស់អ្នកបានរារាំងផ្ទាំង System Print dialog ពីការបើកដំណើរការ។ 
                សូមចុចប៊ូតុង <strong>«បើកក្នុង Tab ថ្មី (Open App in New Tab)»</strong> នៅជ្រុងខាងលើខាងស្តាំនៃកម្មវិធី AI Studio ដើម្បីដំណើរការព្រីនបានធម្មតា និងលឿនបំផុត!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Print Preview Area Container */}
      <div className="lg:col-span-2 space-y-4">
        {/* Success Alert Banner when System Print is bypassed */}
        {showSuccessToast && (
          <div className="bg-emerald-600 border border-emerald-500 text-white rounded-2xl p-4 flex items-start gap-3 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="p-1 bg-white/20 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-xs uppercase tracking-wide">រក្សាទុកការបោះពុម្ពបានជោគជ័យ!</h4>
              <p className="text-[11px] text-emerald-100 leading-relaxed">
                ប្រព័ន្ធបានកត់ត្រា និងបង្កើនស្ថិតិបោះពុម្ពចំនួន <strong className="text-white">{selectedItems.length} ប័ណ្ណ</strong> នៅក្នុងទិន្នន័យរួចរាល់ហើយ ដោយមិនបាច់បើកផ្ទាំង System Print Dialog ឡើយ។
              </p>
            </div>
          </div>
        )}

        {/* Helper info bar */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between no-print text-xs">
          <p className="text-emerald-800 font-semibold leading-relaxed">
            ✨ <strong>គំរូមើលមុន (Interactive Canvas preview)</strong>៖ រៀបចំព័ត៌មាននៅលើស្លាកបានយ៉ាងសមស្រប។ ពេលចុច <strong>"បោះពុម្ព"</strong> ម៉ាស៊ីននឹងលាក់បាំងប្រព័ន្ធគ្រប់គ្រងដទៃទៀតស្វ័យប្រវត្ត។
          </p>
        </div>

        {/* Custom Dynamic grid styles for physical printing */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .print-grid-layout {
              display: grid !important;
              grid-template-columns: repeat(${setup.layoutCols}, minmax(0, 1fr)) !important;
              gap: ${setup.spacing}px !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
            }
            .sticker-badge {
              width: ${setup.badgeWidth} !important;
              height: ${setup.badgeHeight} !important;
              padding: 4px !important;
              margin: 0 auto !important;
              background-color: ${setup.colorLight} !important;
              border: 1px solid #e2e8f0 !important;
              box-sizing: border-box !important;
            }
          }
        `}} />

        {/* The sticker grid */}
        <div 
          id="print-stage"
          className="print-area bg-slate-50 border border-slate-100 rounded-3xl p-6 min-h-[350px] flex items-center justify-center overflow-auto"
        >
          <div 
            className="print-grid-layout w-full grid" 
            style={{ 
              gridTemplateColumns: `repeat(${setup.layoutCols}, minmax(0, 1fr))`,
              gap: `${setup.spacing}px` 
            }}
          >
            {selectedItems.map((item) => {
              const src = qrUrls[item.id];
              return (
                <div 
                  key={item.id}
                  className="print-item sticker-badge flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-center relative overflow-hidden transition-all"
                  style={{
                    backgroundColor: setup.colorLight,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    minHeight: setup.badgeHeight !== 'auto' ? setup.badgeHeight : 'auto'
                  }}
                >
                  {/* Optional Category Stamp */}
                  {item.category && (
                    <span 
                      className="absolute top-1 right-2 text-[8px] font-bold text-slate-400 tracking-tight uppercase"
                    >
                      {item.category}
                    </span>
                  )}

                  {/* QR Image */}
                  {src ? (
                    <img 
                      src={src} 
                      alt={`Product QR ${item.code}`}
                      style={{ 
                        width: `${setup.qrSize}px`, 
                        height: `${setup.qrSize}px` 
                      }}
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="animate-pulse bg-slate-100 rounded-lg flex items-center justify-center"
                      style={{ width: `${setup.qrSize}px`, height: `${setup.qrSize}px` }}
                    >
                      <span className="text-[10px] text-slate-400">កំពុងបង្កើត...</span>
                    </div>
                  )}

                  {/* Texts elements */}
                  <div className="mt-1 space-y-0.5 w-full text-center">
                    {/* Item Name */}
                    {setup.showLabel && (
                      <h5 
                        className="font-bold text-slate-800 leading-tight tracking-tight break-words max-w-full truncate"
                        style={{ fontSize: `${setup.fontSize}px`, color: setup.colorDark }}
                      >
                        {item.name}
                      </h5>
                    )}

                    {/* Code String */}
                    {setup.showCode && (
                      <p 
                        className="font-mono text-slate-500 font-semibold uppercase leading-none truncate max-w-full"
                        style={{ fontSize: `${Math.max(8, setup.fontSize - 3)}px` }}
                      >
                        {item.code}
                      </p>
                    )}

                    {/* Price Tag */}
                    {setup.showPrice && item.price && (
                      <p 
                        className="font-bold text-emerald-700 leading-none"
                        style={{ fontSize: `${setup.fontSize + 1}px` }}
                      >
                        {item.price}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
