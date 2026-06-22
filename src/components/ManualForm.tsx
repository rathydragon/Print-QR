/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlusCircle, Barcode, Package, DollarSign, Tag, FileText } from 'lucide-react';
import { QRCodeItem } from '../types';

interface ManualFormProps {
  onAdd: (item: Omit<QRCodeItem, 'id' | 'createdAt' | 'printedCount'>) => Promise<any>;
}

export default function ManualForm({ onAdd }: ManualFormProps) {
  const [code, setCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErr('សូមបំពេញកូដផលិតផលជាដាច់ខាត!');
      return;
    }

    setLoading(true);
    setErr(null);
    setSuccess(false);

    try {
      await onAdd({
        code: code.trim(),
        name: code.trim(), // Use code as display label
        price: '',
        category: '',
        notes: '',
      });

      // Reset
      setCode('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setErr('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ។ សូមសាកល្បងម្ដងទៀត។');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="manual-form-root" onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-brand-500" />
          បញ្ចូលផលិតផលដោយផ្ទាល់ (ផ្ដោតដៃ)
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          បញ្ចូលទិន្នន័យ កូដ ឬ SKU ផលិតផលដើម្បីបង្កើត QR Code ភ្លាមៗ និងរក្សាទុកក្នុងប្រព័ន្ធ
        </p>
      </div>

      {err && (
        <div id="manual-error" className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium">
          {err}
        </div>
      )}

      {success && (
        <div id="manual-success" className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl font-medium">
          បានបញ្ចូល និងរក្សាទុកផលិតផលដោយជោគជ័យ!
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {/* Code Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
            <Barcode className="w-3.5 h-3.5 text-slate-400" />
            លេខកូដផលិតផល/QR * (SKU/Code)
          </label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ឧទាហរណ៍៖ PROD-9988"
            className="w-full text-sm bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 rounded-xl px-3.5 py-2.5 outline-none transition"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10 transition active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          {loading ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកផលិតផល'}
        </button>
      </div>
    </form>
  );
}
