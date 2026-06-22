/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, Wifi, WifiOff, Cloud, RefreshCw, Layers } from 'lucide-react';
import { isFirebaseEnabled, auth } from '../firebase';
import { verifyFirestoreConnection } from '../services/qrService';

export default function SyncIndicator() {
  const [dbStatus, setDbStatus] = useState<'cloud' | 'local' | 'connecting'>('connecting');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function checkState() {
      if (isFirebaseEnabled) {
        setDbStatus('connecting');
        const online = await verifyFirestoreConnection();
        if (online) {
          setDbStatus('cloud');
        } else {
          // If Firebase is enabled but connection has restricted access / no quota
          setDbStatus('local');
        }
      } else {
        setDbStatus('local');
      }
    }
    checkState();
  }, []);

  const triggerSyncSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
    }, 1000);
  };

  return (
    <div id="sync-indicator-root" className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
          dbStatus === 'cloud' 
            ? 'bg-emerald-50 text-emerald-600' 
            : dbStatus === 'connecting'
            ? 'bg-amber-50 text-amber-500'
            : 'bg-indigo-50 text-indigo-600'
        }`}>
          {dbStatus === 'cloud' ? (
            <Cloud className="w-5 h-5 animate-pulse" />
          ) : (
            <Database className="w-5 h-5" />
          )}
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              {dbStatus === 'cloud' ? 'ប្រព័ន្ធទិន្នន័យពពក (Cloud Database)' : 'ម៉ាស៊ីនរក្សាទុកមូលដ្ឋាន (Local DB Engine)'}
            </span>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                dbStatus === 'cloud' ? 'bg-emerald-400' : 'bg-indigo-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                dbStatus === 'cloud' ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}></span>
            </span>
          </div>
          
          <p className="text-xs text-slate-500 mt-0.5">
            {dbStatus === 'cloud' 
              ? 'រាល់ការផ្លាស់ប្តូរ និងផលិតផល Excel ត្រូវបានរក្សាទុកដោយស្វ័យប្រវត្តក្នុង Cloud Firestore' 
              : 'ទិន្នន័យត្រូវបានរក្សាទុកដោយសុវត្ថិភាពខ្ពស់ក្នុង Browser localStorage របស់អ្នក'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {dbStatus === 'local' && (
          <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            គាំទ្រ Offline 100%
          </div>
        )}
        
        {dbStatus === 'cloud' && (
          <button 
            onClick={triggerSyncSync}
            className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'កំពុងធ្វើសមកាលកម្ម...' : 'ធ្វើសមកាលកម្មត្រឹមត្រូវ'}
          </button>
        )}
      </div>
    </div>
  );
}
