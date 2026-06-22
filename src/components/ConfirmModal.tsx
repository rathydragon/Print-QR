/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmModalProps) {
  // Lock scroll on background when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="confirm-modal-portal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            id="confirm-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            id="confirm-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-10 overflow-hidden"
          >
            {/* Close Button */}
            <button
              id="confirm-modal-btn-close"
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content Layout */}
            <div className="flex flex-col items-center text-center mt-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                type === 'danger' 
                  ? 'bg-rose-50 text-rose-600' 
                  : type === 'warning' 
                  ? 'bg-amber-50 text-amber-600' 
                  : 'bg-indigo-50 text-indigo-600'
              }`}>
                <AlertTriangle className="w-7 h-7 stroke-[2]" />
              </div>

              <h3 id="confirm-modal-title" className="text-lg font-extrabold text-slate-800 tracking-tight px-2">
                {title}
              </h3>
              
              <p id="confirm-modal-message" className="text-sm text-slate-500 font-medium leading-relaxed mt-2.5 max-w-sm">
                {message}
              </p>
            </div>

            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-50">
              <button
                id="confirm-modal-btn-cancel"
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-100 transition active:scale-[0.98]"
              >
                {cancelText}
              </button>
              <button
                id="confirm-modal-btn-confirm"
                type="button"
                onClick={() => {
                  onConfirm();
                }}
                className={`w-full sm:w-auto px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-[0.98] ${
                  type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                    : type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10'
                    : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/10'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
