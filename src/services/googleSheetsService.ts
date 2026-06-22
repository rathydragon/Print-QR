/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { QRCodeItem } from '../types';

// Reuse or initialize Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Store Google Sheet link in local storage
const SPREADSHEET_ID_KEY = 'google_sheets_qr_spreadsheet_id';

export function getSavedSpreadsheetId(): string | null {
  return localStorage.getItem(SPREADSHEET_ID_KEY);
}

export function saveSpreadsheetId(id: string) {
  localStorage.setItem(SPREADSHEET_ID_KEY, id);
}

export function clearSavedSpreadsheetId() {
  localStorage.removeItem(SPREADSHEET_ID_KEY);
}

// Initial Listener to register callbacks
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google with requested scopes
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err) {
    console.error('Google Sign-In Error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Drive API: Look for "QR Code List (QR Code Printer)" spreadsheet in Google Drive.
 * This ensures we don't duplicate files in Google Drive.
 */
async function findExistingSpreadsheet(accessToken: string): Promise<string | null> {
  try {
    const q = encodeURIComponent("name = 'QR Code List (QR Code Printer)' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (res.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }

    if (!res.ok) {
      console.warn('Google Drive search failed, status:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id; // Return the first found file ID
    }
  } catch (error: any) {
    if (error.message === 'TOKEN_EXPIRED') throw error;
    console.error('Error finding existing spreadsheet in Drive:', error);
  }
  return null;
}

/**
 * Sheets API: Create a new spreadsheet in user's Google Drive.
 */
async function createSpreadsheet(accessToken: string): Promise<string> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  
  const body = {
    properties: {
      title: 'QR Code List (QR Code Printer)',
    },
    sheets: [
      {
        properties: {
          title: 'ផលិតផល (Products)',
          gridProperties: {
            frozenRowCount: 1, // Freeze header row
          }
        }
      }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const data = await res.json();
  return data.spreadsheetId;
}

/**
 * Merge and sync current catalog items into the Google Sheet.
 * This intelligently matches by `id` or `code` to prevent duplicate values!
 */
export async function syncCatalogToGoogleSheet(
  items: QRCodeItem[],
  accessToken: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  if (!accessToken) {
    throw new Error('Access token is missing. Please sign in again.');
  }

  // 1. Find or create Spreadsheet
  let spreadsheetId = getSavedSpreadsheetId();
  if (spreadsheetId) {
    onProgress?.('កំពុងផ្ទៀងផ្ទាត់សន្លឹកកិច្ចការ...');
    // Verify it still exists in the user's drive
    const verifyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=id,trashed`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (verifyRes.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    if (!verifyRes.ok) {
      spreadsheetId = null;
      clearSavedSpreadsheetId();
    } else {
      const metadata = await verifyRes.json();
      if (metadata.trashed) {
        spreadsheetId = null;
        clearSavedSpreadsheetId();
      }
    }
  }

  if (!spreadsheetId) {
    onProgress?.('កំពុងស្វែងរកឯកសារក្នុង Google Drive...');
    spreadsheetId = await findExistingSpreadsheet(accessToken);
    if (spreadsheetId) {
      saveSpreadsheetId(spreadsheetId);
      onProgress?.('រកឃើញឯកសារចាស់រួចជាស្រេច!');
    }
  }

  if (!spreadsheetId) {
    onProgress?.('កំពុងបង្កើតឯកសារ Google Sheet ថ្មី...');
    spreadsheetId = await createSpreadsheet(accessToken);
    saveSpreadsheetId(spreadsheetId);
    onProgress?.('បានបង្កើតឯកសារ Google Sheet ថ្មីបង្កើនជោគជ័យ!');
  }

  // 2. Fetch current rows from Google Sheet to avoid duplicate entries
  onProgress?.('កំពុងផ្ទៀងផ្ទាត់ទិន្នន័យចាស់ដើម្បីកុំឱ្យស្ទួន...');
  const sheetTabName = 'ផលិតផល (Products)';
  const range = `${sheetTabName}!A:H`;
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  let existingCells: string[][] = [];
  try {
    const getRes = await fetch(getUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (getRes.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    if (getRes.ok) {
      const data = await getRes.json();
      existingCells = data.values || [];
    }
  } catch (err: any) {
    if (err.message === 'TOKEN_EXPIRED') throw err;
    console.warn('Spreadsheet request error: default fallback', err);
  }

  // Define headers in Khmer for readability
  const headers = [
    'ID',
    'កូដផលិតផល (Code)',
    'ឈ្មោះផលិតផល (Name)',
    'តម្លៃ (Price)',
    'ប្រភេទ (Category)',
    'កំណត់សម្គាល់ (Notes)',
    'ចំនួនបោះពុម្ព (Printed Count)',
    'ថ្ងៃបង្កើត (Created At)'
  ];

  // Map local items to sheet row formats
  // Row order: ID, Code, Name, Price, Category, Notes, Printed Count, Created At
  
  // Intelligent Merging to prevent duplicates while updating existing rows:
  let updatedRows: string[][] = [headers];
  
  if (existingCells.length > 0) {
    // If table already has contents, keep any headers but we map by ID is safest
    // Let's index existing rows by their unique ID (first column index 0)
    // We skip index 0 which is headers
    const existingById: Record<string, { index: number; row: string[] }> = {};
    for (let i = 1; i < existingCells.length; i++) {
      const row = existingCells[i];
      const id = row[0];
      if (id) {
        existingById[id] = { index: i, row };
      }
    }

    // Now, let's create a combined catalog list
    // We rebuild rows: starting with headers, then adding/updating items
    const processedIds = new Set<string>();
    
    // First, for each item in our actual current screen list we either update or insert
    items.forEach((item) => {
      const rowValue = [
        item.id,
        item.code || '',
        item.name || '',
        item.price !== undefined ? String(item.price) : '',
        item.category || '',
        item.notes || '',
        String(item.printedCount || 0),
        item.createdAt || new Date().toISOString()
      ];
      updatedRows.push(rowValue);
      processedIds.add(item.id);
    });

    // Secondly, if there were items in Google Sheets that are NOT in our active list anymore, 
    // let's decide if we want to keep them to protect client data from accidental wipes.
    // Wiped/deleted products in app won't automatically clean Sheets, we keep them at the end.
    for (let id in existingById) {
      if (!processedIds.has(id)) {
        updatedRows.push(existingById[id].row);
      }
    }
  } else {
    // If newly created or completely empty spreadsheet, just write headers and local rows
    items.forEach((item) => {
      updatedRows.push([
        item.id,
        item.code || '',
        item.name || '',
        item.price !== undefined ? String(item.price) : '',
        item.category || '',
        item.notes || '',
        String(item.printedCount || 0),
        item.createdAt || new Date().toISOString()
      ]);
    });
  }

  // 3. Sync to Google Sheets! We write the merged rows using a simple PUT update range API.
  // This updates the entire worksheet range dynamically.
  onProgress?.('កំពុងរក្សាទុកទិន្នន័យ (Preventing duplicate)...');
  
  // We can write range "A1:H" with sizing up to updatedRows.length
  const writeRange = `${sheetTabName}!A1:H${updatedRows.length + 1}`;
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`;

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: updatedRows
    })
  });

  if (putRes.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (!putRes.ok) {
    const errText = await putRes.text();
    // If table tab was missing or range doesn't match, let's create the tab tab name!
    if (errText.includes('range') || errText.includes('sheet') || errText.includes('gridProperties')) {
      try {
        onProgress?.('កំពុងរៀបចំប្រព័ន្ធសន្លឹកកិច្ចការ...');
        const addSheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
        await fetch(addSheetUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'ផលិតផល (Products)',
                    gridProperties: {
                      frozenRowCount: 1,
                    }
                  }
                }
              }
            ]
          })
        });

        // Retry PUT with fresh sheet tab
        const retryRes = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: updatedRows
          })
        });

        if (retryRes.status === 401) {
          throw new Error('TOKEN_EXPIRED');
        }
        if (!retryRes.ok) {
          throw new Error(`Failed on retry sheet update: ${await retryRes.text()}`);
        }
      } catch (innerErr: any) {
        if (innerErr.message === 'TOKEN_EXPIRED') throw innerErr;
        throw new Error(`Failed to initialize 'ផលិតផល' tab in Google Sheets: ${errText}`);
      }
    } else {
      throw new Error(`Failed to update google sheet values: ${errText}`);
    }
  }

  // If there are more rows down there left from previous sync that are now removed, let's clear them
  if (existingCells.length > updatedRows.length) {
    const clearRange = `${sheetTabName}!A${updatedRows.length + 1}:H${existingCells.length + 1}`;
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
  }

  onProgress?.('រក្សាទុកក្នុង Google Sheet ជោគជ័យ!');
  return spreadsheetId;
}
