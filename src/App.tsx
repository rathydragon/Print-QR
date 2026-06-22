/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, PlusCircle, Printer, Database, Info, 
  Sparkles, CheckCircle2, BookmarkCheck, Barcode, ListPlus
} from 'lucide-react';
import { QRCodeItem } from './types';
import { 
  getQRCodeItems, 
  addQRCodeItem, 
  updateQRCodeItem, 
  deleteQRCodeItem, 
  bulkAddQRCodeItems, 
  clearAllQRCodeItems 
} from './services/qrService';

import ExcelImporter from './components/ExcelImporter';
import ManualForm from './components/ManualForm';
import ItemsTable from './components/ItemsTable';
import PrintGrid from './components/PrintGrid';
import SyncIndicator from './components/SyncIndicator';

export default function App() {
  const [items, setItems] = useState<QRCodeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Load items on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await getQRCodeItems();
        setItems(data);
      } catch (err) {
        console.error('Error fetching data source:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const triggerNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Add a single item
  const handleAddItem = async (itemData: Omit<QRCodeItem, 'id' | 'createdAt' | 'printedCount'>) => {
    try {
      const added = await addQRCodeItem(itemData);
      setItems((prev) => [added, ...prev]);
      triggerNotification(`បានរក្សាទុកផលិតផល "${added.name}" ដោយជោគជ័យ!`);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Import items from Excel
  const handleExcelImport = async (importedItems: Array<Omit<QRCodeItem, 'id' | 'createdAt' | 'printedCount'>>) => {
    try {
      setIsLoading(true);
      const addedItems = await bulkAddQRCodeItems(importedItems);
      setItems((prev) => [...addedItems, ...prev]);
      triggerNotification(`បាននាំចូលទិន្នន័យផលិតផលចំនួន ${addedItems.length} ជោគជ័យ!`);
    } catch (err) {
      console.error(err);
      alert('មានបញ្ហាក្នុងការនាំចូលទិន្នន័យ។');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit single item
  const handleEditItem = async (id: string, updates: Partial<QRCodeItem>) => {
    try {
      await updateQRCodeItem(id, updates);
      setItems((prev) => 
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
      triggerNotification('បានកែសម្រួលព័ត៌មានរួចរាល់!');
    } catch (err) {
      console.error(err);
      alert('មិនអាចរក្សាទុកការកែប្រែបានឡើយ។');
    }
  };

  // Delete single item
  const handleDeleteItem = async (id: string) => {
    try {
      await deleteQRCodeItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      triggerNotification('បានលុបផលិតផលរួចរាល់!', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk delete selected items
  const handleBulkDelete = async (idsToDelete: string[]) => {
    try {
      setIsLoading(true);
      for (const id of idsToDelete) {
        await deleteQRCodeItem(id);
      }
      setItems((prev) => prev.filter((item) => !idsToDelete.includes(item.id)));
      setSelectedIds([]);
      triggerNotification(`បានលុបផលិតផលចំនួន ${idsToDelete.length} ចេញរួចរាល់!`, 'info');
    } catch (err) {
      console.error(err);
      alert('មានបញ្ហាក្នុងការលុបផលិតផល។');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all items on catalog
  const handleClearAllItems = async () => {
    try {
      setIsLoading(true);
      await clearAllQRCodeItems();
      setItems([]);
      setSelectedIds([]);
      triggerNotification('បានលុបសម្អាតបញ្ជីផលិតផលទាំងអស់ជោគជ័យ!', 'info');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update print counters when label sheet is processed
  const handlePrintCountSave = async (printedIds: string[]) => {
    try {
      for (const id of printedIds) {
        const findItem = items.find((itm) => itm.id === id);
        if (findItem) {
          const nextCount = (findItem.printedCount || 0) + 1;
          await updateQRCodeItem(id, { printedCount: nextCount });
          setItems((prev) => 
            prev.map((item) => (item.id === id ? { ...item, printedCount: nextCount } : item))
          );
        }
      }
      triggerNotification('បញ្ជីបោះពុម្ពត្រូវបានបញ្ជូនទៅម៉ាស៊ីនព្រីនរួចរាល់!');
    } catch (err) {
      console.error('Error saving printed count tracker', err);
    }
  };

  // Filter selected items for printable grid
  const selectedItemsForPrint = items.filter((item) => selectedIds.includes(item.id));

  return (
    <div id="full-app-root" className="min-h-screen mesh-bg font-sans text-slate-800">
      
      {/* 🚀 Sleek Header (Hidden inside physical prints) */}
      <header id="app-header" className="bg-white border-b border-slate-100 py-5 sticky top-0 z-30 no-print transition-all">
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Barcode className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  កម្មវិធីបង្កើត និងព្រីន QR Code
                </h1>
                <span className="text-[10px] bg-brand-50 text-brand-600 font-extrabold px-2 py-0.5 rounded-full border border-brand-100 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                នាំចូលទិន្នន័យពី Excel / CSV | បោះពុម្ពប័ណ្ណស្ទីគ័រ | រក្សាក្នុងប្រព័ន្ធទិន្នន័យ
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-100 font-medium text-right">
              ម៉ោងបច្ចុប្បន្ន៖ <span className="font-mono text-slate-700 font-bold">2026-06-22</span>
            </div>
          </div>
        </div>
      </header>

      {/* 🌟 Master Layout Container */}
      <main id="app-main" className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        
        {/* Real-time Toast Notifications (No print) */}
        {notification && (
          <div 
            id="toast-notification"
            className={`no-print fixed top-6 right-6 z-50 p-4 rounded-2xl border flex items-center gap-3 shadow-xl max-w-sm animate-bounce ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-indigo-50 border-indigo-100 text-indigo-800'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold leading-normal">{notification.message}</p>
          </div>
        )}

        {/* 🛰️ Database Sync Info Banner (No print) */}
        <section id="banner-sync" className="no-print">
          <SyncIndicator items={items} onSyncNotification={triggerNotification} />
        </section>

        {/* Tabs & Importers (No print) */}
        <section id="section-inputs" className="no-print grid grid-cols-1 gap-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-3.5 flex items-center gap-3 max-w-md shadow-sm">
            <button
              onClick={() => setActiveTab('excel')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'excel' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              នាំចូលបញ្ជី Excel / CSV
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'manual' 
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              បញ្ចូលផលិតផលផ្ទាល់
            </button>
          </div>

          <div className="transition-all duration-300">
            {activeTab === 'excel' ? (
              <ExcelImporter onImport={handleExcelImport} />
            ) : (
              <ManualForm onAdd={handleAddItem} />
            )}
          </div>
        </section>

        {/* Table & Print Grid Preview (Print grid becomes ONLY shown tag on media printing) */}
        <section id="section-catalog" className="grid grid-cols-1 gap-6">
          
          <div className="no-print">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-800 font-black">
                <BookmarkCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg">បញ្ជីគំរូទិន្នន័យផលិតផលក្នុងប្រព័ន្ធ ({items.length})</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                * ជ្រើសរើស (Check) ផលិតផលដែលចង់ព្រីន QR Code
              </p>
            </div>

            {isLoading ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-xs font-semibold text-slate-500">កំពុងអានទិន្នន័យពីប្រព័ន្ធ...</p>
              </div>
            ) : (
              <ItemsTable 
                items={items}
                selectedIds={selectedIds}
                onSelectIds={setSelectedIds}
                onDelete={handleDeleteItem}
                onEdit={handleEditItem}
                onClearAll={handleClearAllItems}
                onBulkDelete={handleBulkDelete}
              />
            )}
          </div>

          {/* Sizing & Canvas layout preview for label design */}
          <div className={`${selectedIds.length > 0 ? 'border-t border-dashed border-slate-200 pt-6' : ''}`}>
            {selectedIds.length > 0 && (
              <div className="no-print flex items-center gap-2 text-slate-800 font-bold mb-3">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg">រចនាសន្លឹកបោះពុម្ពស្ទីគ័រ ({selectedIds.length} ផលិតផល)</h3>
              </div>
            )}
            
            <PrintGrid 
              selectedItems={selectedItemsForPrint} 
              onPrintSaved={handlePrintCountSave}
            />
          </div>

        </section>
      </main>

      {/* Footer Branding */}
      <footer id="app-footer" className="no-print border-t border-slate-100 bg-white py-6 text-center text-xs text-slate-400 mt-12">
        <p className="font-semibold leading-relaxed">
          រក្សាសិទ្ធិគ្រប់យ៉ាង © 2026 - កម្មវិធីព្រីន QR Code ពី Excel & លំដាប់ប្រព័ន្ធទិន្នន័យសុវត្ថិភាព
        </p>
        <p className="text-[10px] text-slate-300 mt-1">
          រចនាឡើងជាមួយ React, TypeSafe TS, Vite, និង Tailwind CSS
        </p>
      </footer>
    </div>
  );
}
