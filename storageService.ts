import { Recording } from '../types';

// Define missing types for File System Access API
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

const DB_NAME = 'ScribeDB';
const DB_VERSION = 2; // Incremented for new store
const METADATA_STORE = 'recordings';
const CONFIG_STORE = 'config';

let dirHandle: FileSystemDirectoryHandle | null = null;

// --- IndexedDB Helpers for Metadata & Handle Storage ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE);
      }
    };
  });
};

// --- Directory Handle Management ---

export const getStoredDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG_STORE, 'readonly');
    const store = tx.objectStore(CONFIG_STORE);
    const request = store.get('rootHandle');
    request.onsuccess = () => {
        dirHandle = request.result || null;
        resolve(dirHandle);
    };
    request.onerror = () => reject(request.error);
  });
};

export const setDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
  dirHandle = handle;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG_STORE, 'readwrite');
    const store = tx.objectStore(CONFIG_STORE);
    const request = store.put(handle, 'rootHandle');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const verifyPermission = async (readWrite: boolean = true): Promise<boolean> => {
  if (!dirHandle) return false;
  const options: FileSystemHandlePermissionDescriptor = { mode: readWrite ? 'readwrite' : 'read' };
  
  // Cast to any to access permission methods not yet in standard lib types
  const handle = dirHandle as any;

  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }
  
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }
  
  return false;
};

// --- File System Operations ---

export const saveAudioFile = async (filename: string, blob: Blob): Promise<void> => {
    if (!dirHandle) throw new Error("Storage directory not connected");
    
    // Create file
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    // Create writable stream
    const writable = await fileHandle.createWritable();
    // Write contents
    await writable.write(blob);
    // Close file
    await writable.close();
};

export const loadAudioFile = async (filename: string): Promise<Blob> => {
    if (!dirHandle) throw new Error("Storage directory not connected");
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return file;
};

// --- Metadata Operations (IndexedDB) ---

export const saveRecordingMetadata = async (recording: Recording): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(METADATA_STORE, 'readwrite');
    const store = tx.objectStore(METADATA_STORE);
    const request = store.put(recording);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllRecordings = async (): Promise<Recording[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(METADATA_STORE, 'readonly');
    const store = tx.objectStore(METADATA_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const result = request.result as Recording[];
      result.sort((a, b) => b.date - a.date);
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getRecordingById = async (id: string): Promise<Recording> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(METADATA_STORE, 'readonly');
    const store = tx.objectStore(METADATA_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- Composite Actions ---

export const saveRecording = async (recording: Recording, blob: Blob): Promise<void> => {
    await saveAudioFile(recording.audioFilename, blob);
    await saveRecordingMetadata(recording);
};