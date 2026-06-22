/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QRCodeItem } from '../types';
import { db, isFirebaseEnabled, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'excel_qr_printer_items';
const COLLECTION_NAME = 'qrcodes';

// Fallback to localStorage
function getLocalItems(): QRCodeItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading localStorage', err);
    return [];
  }
}

function saveLocalItems(items: QRCodeItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving to localStorage', err);
  }
}

export async function verifyFirestoreConnection(): Promise<boolean> {
  if (!isFirebaseEnabled || !db) return false;
  try {
    // Attempt a silent server-only network verify
    await getDocFromServer(doc(db, 'test_connection', 'ping'));
    return true;
  } catch (e) {
    // Connection failed or unauthorized, but firebase object exists
    console.log('Firestore connection validation ping failed or restricted. Operating dynamically.', e);
    return false;
  }
}

export async function getQRCodeItems(): Promise<QRCodeItem[]> {
  if (!isFirebaseEnabled || !db) {
    return getLocalItems().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const items: QRCodeItem[] = [];
    
    snapshot.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        code: data.code || '',
        name: data.name || '',
        price: data.price ?? '',
        category: data.category || '',
        createdAt: data.createdAt || new Date().toISOString(),
        notes: data.notes || '',
        printedCount: data.printedCount || 0,
      });
    });

    // Mirror to local for fast access
    saveLocalItems(items);
    return items;
  } catch (error) {
    console.warn('Firestore fetch failed, accessing local mirrored database.', error);
    // If permission or network triggers, use local state
    return getLocalItems().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function addQRCodeItem(
  item: Omit<QRCodeItem, 'id' | 'createdAt' | 'printedCount'>
): Promise<QRCodeItem> {
  const newItem: QRCodeItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString(),
    printedCount: 0,
  };

  // 1. Write locally
  const local = getLocalItems();
  local.unshift(newItem);
  saveLocalItems(local);

  // 2. Write to Firebase if enabled
  if (isFirebaseEnabled && db) {
    try {
      // Use setDoc with our generated ID to keep them in sync
      await setDoc(doc(db, COLLECTION_NAME, newItem.id), {
        code: newItem.code,
        name: newItem.name,
        price: newItem.price ?? '',
        category: newItem.category ?? '',
        createdAt: newItem.createdAt,
        notes: newItem.notes ?? '',
        printedCount: newItem.printedCount,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${newItem.id}`);
    }
  }

  return newItem;
}

export async function updateQRCodeItem(id: string, updates: Partial<QRCodeItem>): Promise<void> {
  // 1. Update locally
  const local = getLocalItems();
  const idx = local.findIndex((i) => i.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updates };
    saveLocalItems(local);
  }

  // 2. Update to Firebase if enabled
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const fsUpdates: Record<string, any> = {};
      if (updates.code !== undefined) fsUpdates.code = updates.code;
      if (updates.name !== undefined) fsUpdates.name = updates.name;
      if (updates.price !== undefined) fsUpdates.price = updates.price;
      if (updates.category !== undefined) fsUpdates.category = updates.category;
      if (updates.notes !== undefined) fsUpdates.notes = updates.notes;
      if (updates.printedCount !== undefined) fsUpdates.printedCount = updates.printedCount;

      await updateDoc(docRef, fsUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  }
}

export async function deleteQRCodeItem(id: string): Promise<void> {
  // 1. Delete locally
  const local = getLocalItems();
  const filtered = local.filter((i) => i.id !== id);
  saveLocalItems(filtered);

  // 2. Delete from Firebase if enabled
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
}

export async function bulkAddQRCodeItems(
  items: Array<Omit<QRCodeItem, 'id' | 'createdAt' | 'printedCount'>>
): Promise<QRCodeItem[]> {
  const createdItems: QRCodeItem[] = items.map((item) => ({
    ...item,
    id: Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString(),
    printedCount: 0,
  }));

  // 1. Write locally
  const local = getLocalItems();
  const updatedLocal = [...createdItems, ...local];
  saveLocalItems(updatedLocal);

  // 2. Write to Firebase if enabled
  if (isFirebaseEnabled && db) {
    try {
      const batch = writeBatch(db);
      createdItems.forEach((item) => {
        const docRef = doc(db, COLLECTION_NAME, item.id);
        batch.set(docRef, {
          code: item.code,
          name: item.name,
          price: item.price ?? '',
          category: item.category ?? '',
          createdAt: item.createdAt,
          notes: item.notes ?? '',
          printedCount: item.printedCount,
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/[BULK_BATCH]`);
    }
  }

  return createdItems;
}

export async function clearAllQRCodeItems(): Promise<void> {
  // Clear locally
  saveLocalItems([]);

  // In Firebase, we would have to delete all. Let's do it or delete locally if off
  if (isFirebaseEnabled && db) {
    try {
      const q = query(collection(db, COLLECTION_NAME));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach((d) => {
        batch.delete(doc(db, COLLECTION_NAME, d.id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
    }
  }
}
