/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, ShieldCheck, Cloud, RefreshCw, FileSpreadsheet, 
  ExternalLink, LogOut, Loader2, Sparkles, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { isFirebaseEnabled } from '../firebase';
import { verifyFirestoreConnection } from '../services/qrService';
import { 
  initAuth, 
  signInWithGoogle, 
  logoutGoogle, 
  syncCatalogToGoogleSheet, 
  getSavedSpreadsheetId 
} from '../services/googleSheetsService';
import { QRCodeItem } from '../types';
import { User } from 'firebase/auth';

interface SyncIndicatorProps {
  items: QRCodeItem[];
  onSyncNotification: (msg: string, type?: 'success' | 'info') => void;
}

export default function SyncIndicator({ items, onSyncNotification }: SyncIndicatorProps) {
  // Firebase Database status
  const [dbStatus, setDbStatus] = useState<'cloud' | 'local' | 'connecting'>('connecting');
  const [syncingCloud, setSyncingCloud] = useState(false);

  // Google Sheets integration status
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);
  const [sheetsProgress, setSheetsProgress] = useState<string>('');
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getSavedSpreadsheetId());
  const [showSheetsCard, setShowSheetsCard] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  // Initialize Auth state listener and iframe detection
  useEffect(() => {
    // Detect iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }

    // Check Firebase Database connection status
    async function checkState() {
      if (isFirebaseEnabled) {
        setDbStatus('connecting');
        const online = await verifyFirestoreConnection();
        if (online) {
          setDbStatus('cloud');
        } else {
          setDbStatus('local');
        }
      } else {
        setDbStatus('local');
      }
    }
    checkState();

    // Check Google Auth state
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        setAuthError(null);
        // Load existing saved sheet id if any
        setSpreadsheetId(getSavedSpreadsheetId());
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  const triggerCloudSync = () => {
    setSyncingCloud(true);
    setTimeout(() => {
      setSyncingCloud(false);
      onSyncNotification('បានធ្វើសមកាលកម្មជាមួយ Cloud Firestore រួចរាល់!');
    }, 1000);
  };

  // Google Login flow
  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setSheetsProgress('កំពុងចូលទៅកាន់គណនី Google...');
      const result = await signInWithGoogle();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setSpreadsheetId(getSavedSpreadsheetId());
        onSyncNotification(`បានភ្ជាប់គណនី Google ${result.user.email} ជោគជ័យ!`);
        setSheetsProgress('');
      }
    } catch (err: any) {
      console.error('Google authorization error:', err);
      let errorMsg = err.message || String(err);
      
      if (err.code === 'auth/popup-blocked') {
        errorMsg = 'ផ្ទាំង Login ត្រូវបានកម្មវិធីរុករក (Browser) របស់អ្នកទប់ស្កាត់ (Popup Blocked)។ សូមចុចលើប៊ូតុង "Open App in New Tab" នៅផ្នែកខាងលើស្ដាំ ដើម្បីដំណើរការសមកាលកម្មជាមួយ Google Sheets!';
      } else if (err.code === 'auth/iframe-directory-not-supported' || window.self !== window.top) {
        errorMsg = 'កម្មវិធីរុករកមិនអនុញ្ញាតឱ្យផ្ទាំង Login បើកដំណើរការក្នុង Iframe Preview នេះឡើយ។ ដើម្បីដំណើរការសមកាលកម្មជាមួយ Google Sheets សូមចុចលើប៊ូតុង "Open App in New Tab" ផ្នែកខាងលើស្ដាំបង្អស់ជាមុនសិន!';
      } else if (err.code === 'auth/network-request-failed') {
        errorMsg = 'ការភ្ជាប់បណ្ដាញអ៊ីនធឺណិតមានបញ្ហា ឬការតភ្ជាប់ត្រូវបានរំខាន។';
      }
      
      setAuthError(errorMsg);
      onSyncNotification('ការភ្ជាប់គណនី Google ត្រូវបានរារាំង ឬបរាជ័យ។', 'info');
      setSheetsProgress('');
    }
  };

  // Google Sign out flow
  const handleGoogleLogout = async () => {
    if (window.confirm('តើអ្នកពិតជាចង់ផ្តាច់គណនី Google ពីកម្មវិធីនេះមែនទេ?')) {
      try {
        await logoutGoogle();
        setGoogleUser(null);
        setGoogleToken(null);
        setSpreadsheetId(null);
        setAuthError(null);
        onSyncNotification('បានផ្តាច់គណនី Google រួចរាល់!', 'info');
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  };

  // Google Sheets dynamic synchronization
  const handleSheetsSync = async () => {
    if (!googleToken) return;
    try {
      setIsSheetsSyncing(true);
      setSheetsProgress('កំពុងចាប់ផ្តើមសមកាលកម្ម...');
      setAuthError(null);
      
      const sheetId = await syncCatalogToGoogleSheet(
        items, 
        googleToken, 
        (msg) => setSheetsProgress(msg)
      );
      
      setSpreadsheetId(sheetId);
      onSyncNotification('បានរក្សាទុកទិន្នន័យក្នុង Google Sheet រួចរាល់ ដោយគ្មានភាពស្ទួន!');
    } catch (err: any) {
      console.error('Google Sheet synchronization mistake:', err);
      if (err.message === 'TOKEN_EXPIRED') {
        setGoogleUser(null);
        setGoogleToken(null);
        setSpreadsheetId(null);
        setAuthError('ការតភ្ជាប់របស់អ្នកបានហួសសុពលភាព (Session Expired)។ សូមភ្ជាប់គណនី Google សារជាថ្មី!');
        onSyncNotification('ការតភ្ជាប់បានហួសសុពលភាព សូមភ្ជាប់គណនីឡើងវិញ', 'info');
      } else {
        setAuthError(`សមកាលកម្មបរាជ័យ៖ ${err.message || err}`);
      }
    } finally {
      setIsSheetsSyncing(false);
      setSheetsProgress('');
    }
  };

  // Trigger auto sync on items update if Google Token is active
  useEffect(() => {
    if (googleToken && items.length > 0 && !isSheetsSyncing) {
      const delay = setTimeout(() => {
        // Run silent auto-sync silently to keep Google Sheets up to date
        syncCatalogToGoogleSheet(items, googleToken).catch((e) => {
          console.warn('Silent sheets auto-sync failed', e);
        });
      }, 5000); // Debounce auto sync to avoid rate limit
      return () => clearTimeout(delay);
    }
  }, [items, googleToken]);

  return (
    <div id="sync-container-root" className="space-y-4">
      {/* 1. Database Connection Status Bar */}
      <div id="sync-indicator-root" className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl flex items-center justify-center shrink-0 ${
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
              <span className="text-sm font-black text-slate-800">
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
            
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">
              {dbStatus === 'cloud' 
                ? 'រាល់ការផ្លាស់ប្តូរទិន្នន័យផលិតផលត្រូវបានរក្សាទុកដោយស្វ័យប្រវត្តក្នុង Cloud Firestore' 
                : 'ទិន្នន័យផលិតផលបច្ចុប្បន្នត្រូវបានរក្សាទុកដោយសុវត្ថិភាពខ្ពស់ក្នុង Browser localStorage របស់អ្នក'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {dbStatus === 'local' && (
            <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              គាំទ្រ Offline 100%
            </div>
          )}
          
          {dbStatus === 'cloud' && (
            <button 
              onClick={triggerCloudSync}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-xl hover:bg-emerald-100/80 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
              {syncingCloud ? 'កំពុងសមកាលកម្ម...' : 'ធ្វើសមកាលកម្មពពក'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Google Sheets Storage Integration Card */}
      {showSheetsCard && (
        <div className="bg-gradient-to-br from-emerald-50/20 to-teal-50/10 border border-emerald-500/10 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-500 text-white p-2.5 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/10">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-800">រក្សាទុកទិន្នន័យក្នុង Google Sheet ផ្ទាល់ខ្លួន</h4>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200/50 uppercase tracking-wide">
                    ធានាមិនស្ទួនឡើយ
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  ភ្ជាប់ជាមួយ Google Sheets ដើម្បីរក្សាទុក បម្រុងទុក (Backup) និងអាចបើកទិន្នន័យមើលបានរាល់ពេល។ 
                  ប្រព័ន្ធមានមុខងារ <strong className="text-emerald-700">Intelligent Merge</strong> ជួយលុបបំបាត់ការសរសេរស្ទួនជួរដេកជានិច្ច!
                </p>
              </div>
            </div>
          </div>

          {/* If there's an auth/sync error */}
          {authError && (
            <div className="bg-rose-50 border border-rose-200/50 text-rose-800 text-xs rounded-2xl p-4 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">មានបញ្ហាក្នុងការភ្ជាប់ ឬរក្សាទុក៖</p>
                <p className="font-medium text-slate-600 leading-relaxed">{authError}</p>
              </div>
            </div>
          )}

          {/* If inside iframe and not logged in */}
          {isInIframe && !googleUser && (
            <div className="bg-amber-50 border border-amber-200/50 text-amber-800 text-xs rounded-2xl p-4 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <p className="font-bold animate-pulse">ព័ត៌មានសំខាន់សម្រាប់ Preview Iframe៖</p>
                <p className="font-medium text-slate-600 leading-relaxed">
                  ដោយសារអ្នកកំពុងប្រើប្រាស់នៅក្នុងផ្ទាំង Preview (iframe) របស់ AI Studio, កម្មវិធីរុករក (Browser) អាចនឹងសន្មតថាវាជាផ្ទាំងមិនសុវត្ថិភាព ហើយទប់ស្កាត់ផ្ទាំង Sign-in (Popup Blocked)។
                  <br />
                  ដើម្បីភ្ជាប់គណនី Google Sheets បានដោយរលូន <strong>សូមចុចលើប៊ូតុង "Open App" ឬ "Open in new tab"</strong> នៅផ្នែកខាងលើបង្អស់ផ្នែកខាងស្ដាំ ដើម្បីបើកដំណើរការកម្មវិធីក្នុងទំព័រពេញលេញ!
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Google Profile/Connection status */}
            <div>
              {googleUser ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <img 
                      src={googleUser.photoURL || undefined} 
                      alt="Google User Photo" 
                      className="w-6 h-6 rounded-full border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      គណនីបានភ្ជាប់៖ <strong className="text-emerald-600 font-semibold">{googleUser.email}</strong>
                    </span>
                  </div>
                  {spreadsheetId ? (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      បានភ្ជាប់ជាមួយឯកសារ Catalog ក្នុង Google Drive
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-amber-500 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      មិនទាន់មានឯកសារ Sheet ទេ! សូមចុចប៊ូតុង សមកាលកម្ម ដើម្បីបង្កើត
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  គណនី Google ៖ <strong className="text-slate-700 font-semibold">មិនទាន់បានភ្ជាប់</strong>
                </div>
              )}
            </div>

            {/* Action buttons (Sign in, Sync, Dropdown) */}
            <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
              {googleUser ? (
                <>
                  {spreadsheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 transition shadow-sm active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      បើកឯកសារ Excel/Sheet
                    </a>
                  )}

                  <button
                    onClick={handleSheetsSync}
                    disabled={isSheetsSyncing}
                    className="text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/10 px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isSheetsSyncing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {isSheetsSyncing ? 'កំពុងរក្សាទុក...' : 'ផ្ញើទៅ Sheet ភ្លាមៗ'}
                  </button>

                  <button
                    onClick={handleGoogleLogout}
                    title="ផ្តាច់គណនី Google"
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/60 rounded-xl transition cursor-pointer active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="bg-white border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  ភ្ជាប់គណនី Google Sheet
                </button>
              )}
            </div>
          </div>

          {/* Progress message overlay */}
          {sheetsProgress && (
            <div className="bg-emerald-600 text-white text-[11px] font-bold tracking-wide rounded-2xl p-3 flex items-center justify-between shadow-sm animate-pulse duration-700">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{sheetsProgress}</span>
              </div>
              <span className="text-[9px] bg-white/20 text-white rounded-md px-1.5 py-0.5 uppercase tracking-wider">
                Intelligent Merge
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
