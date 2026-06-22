/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Search, Filter, Trash2, Edit2, Check, X, 
  Printer, Square, CheckSquare, RefreshCw, ChevronLeft, ChevronRight, Barcode 
} from 'lucide-react';
import { QRCodeItem } from '../types';
import ConfirmModal from './ConfirmModal';

interface ItemsTableProps {
  items: QRCodeItem[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, updates: Partial<QRCodeItem>) => Promise<void>;
  onClearAll: () => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
}

// Inline Thumbnail generator using Canvas/toDataURL
function QRThumbnail({ code }: { code: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(code, { 
      width: 50, 
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#f8fafc'
      }
    })
      .then(url => {
        if (active) setSrc(url);
      })
      .catch(err => console.error('Error rendering thumbnail', err));
    return () => { active = false; };
  }, [code]);

  return src ? (
    <img 
      src={src} 
      alt="QR Thumbnail" 
      className="w-10 h-10 rounded-lg border border-slate-100 shadow-sm"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center">
      <Barcode className="w-5 h-5 text-slate-300" />
    </div>
  );
}

export default function ItemsTable({
  items,
  selectedIds,
  onSelectIds,
  onDelete,
  onEdit,
  onClearAll,
  onBulkDelete,
}: ItemsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edited values state
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Custom ConfirmModal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset pagination when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Extract distinct categories
  const categories = ['all', ...Array.from(new Set(items.map(item => item.category).filter(Boolean)))];

  // Filtering logic
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || 
      item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection helpers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      onSelectIds([]); // deselect all
    } else {
      onSelectIds(filteredItems.map(item => item.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectIds(selectedIds.filter(x => x !== id));
    } else {
      onSelectIds([...selectedIds, id]);
    }
  };

  const startEditing = (item: QRCodeItem) => {
    setEditingId(item.id);
    setEditCode(item.code);
    setEditName(item.name);
    setEditPrice(String(item.price || ''));
    setEditCategory(item.category || '');
    setEditNotes(item.notes || '');
  };

  const saveEditing = async (id: string) => {
    if (!editCode.trim() || !editName.trim()) {
      alert('សូមបំពេញកូដសម្គាល់ និងឈ្មោះផលិតផល!');
      return;
    }
    await onEdit(id, {
      code: editCode.trim(),
      name: editName.trim(),
      price: editPrice.trim(),
      category: editCategory.trim(),
      notes: editNotes.trim(),
    });
    setEditingId(null);
  };

  const handleDeleteAllWithConfirm = () => {
    setConfirmState({
      isOpen: true,
      title: 'តើអ្នកពិតជាចង់លុបទិន្នន័យផលិតផលទាំងអស់មែនទេ?',
      message: 'សកម្មភាពនេះនឹងលុបផលិតផលទាំងអស់ចេញពីបញ្ជីជាអចិន្ត្រៃយ៍ ហើយមិនអាចសង្គ្រោះវិញបានឡើយ។',
      confirmText: 'លុបទាំងអស់',
      cancelText: 'បោះបង់',
      type: 'danger',
      onConfirm: async () => {
        await onClearAll();
        onSelectIds([]);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBulkDeleteWithConfirm = () => {
    if (selectedIds.length === 0) return;
    setConfirmState({
      isOpen: true,
      title: `តើអ្នកចង់លុបទិន្នន័យដែលបានជ្រើសរើសមែនទេ?`,
      message: `សកម្មភាពនេះនឹងលុបផលិតផលចំនួន ${selectedIds.length} ដែលអ្នកបានជ្រើសរើសរួច ចេញពីបញ្ជីជាអចិន្ត្រៃយ៍។`,
      confirmText: 'លុបចោល',
      cancelText: 'បោះបង់',
      type: 'danger',
      onConfirm: async () => {
        await onBulkDelete(selectedIds);
        onSelectIds([]);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteOneWithConfirm = (item: QRCodeItem) => {
    setConfirmState({
      isOpen: true,
      title: 'តើអ្នកពិតជាចង់លុបផលិតផលនេះចេញពីបញ្ជីមែនទេ?',
      message: `សកម្មភាពនេះនឹងលុបផលិតផល "${item.name}" (${item.code}) ចេញពីបញ្ជីជាអចិន្ត្រៃយ៍។`,
      confirmText: 'លុបចោល',
      cancelText: 'បោះបង់',
      type: 'danger',
      onConfirm: async () => {
        await onDelete(item.id);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div id="items-table-root" className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកកូដ, ឈ្មោះផលិតផល..."
            className="w-full text-sm bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 rounded-xl pl-11 pr-4 py-2.5 outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>ក្រុម៖</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'ទាំងអស់ (All)' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <button
              id="btn-delete-selected"
              onClick={handleBulkDeleteWithConfirm}
              className="text-xs font-semibold px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 rounded-xl flex items-center gap-1.5 transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              លុបដែលជ្រើសរើស ({selectedIds.length})
            </button>
          )}

          {items.length > 0 && (
            <button
              id="btn-clear-all"
              onClick={handleDeleteAllWithConfirm}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 hover:text-slate-800 rounded-xl flex items-center gap-1.5 transition ml-auto md:ml-0"
            >
              លុបទាំងអស់
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto border border-slate-100 rounded-2xl">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-100 font-semibold">
              <th className="px-4 py-3.5 w-12 text-center">
                <button 
                  onClick={handleSelectAll} 
                  className="text-slate-400 hover:text-brand-500 transition"
                  type="button"
                >
                  {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-brand-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3.5 w-16">រូប QR</th>
              <th className="px-4 py-3.5">កូដសម្គាល់</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Barcode className="w-12 h-12 text-slate-200 stroke-[1.5]" />
                    <span className="text-sm font-medium">មិនមានទិន្នន័យផលិតផលដើម្បីបង្ហាញឡើយ</span>
                    <span className="text-xs text-slate-400">សូមបញ្ចូលទិន្នន័យពី Excel ឬបំពេញដោយផ្ទាល់ក្នុងទម្រង់ខាងលើ</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-50/50 transition-colors ${
                      isSelected ? 'bg-brand-50/10' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-2.5 text-center">
                      <button 
                        onClick={() => handleToggleSelectOne(item.id)}
                        className="text-slate-400 hover:text-brand-500 transition"
                        type="button"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-brand-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>

                    {/* QR Thumb */}
                    <td className="px-4 py-2.5">
                      <QRThumbnail code={item.code} />
                    </td>

                    {/* Code */}
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            បង្ហាញពី {(currentPage - 1) * itemsPerPage + 1} ដល់ {Math.min(currentPage * itemsPerPage, filteredItems.length)} ក្នុងចំណោម {filteredItems.length} ផលិតផល
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-3 text-slate-700">
              ទំព័រ {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reusable Beautiful Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        type={confirmState.type}
      />
    </div>
  );
}
