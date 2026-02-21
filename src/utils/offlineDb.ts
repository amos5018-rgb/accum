import { openDB, type DBSchema } from 'idb';
import type { Student, StudentRecord, OfflineQueueItem } from '../types';

interface AccumDB extends DBSchema {
  offlineQueue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-timestamp': number };
  };
  cachedStudents: {
    key: string;
    value: { classId: string; students: Student[]; fetchedAt: number };
  };
  cachedRecords: {
    key: string;
    value: { studentId: string; records: StudentRecord[]; fetchedAt: number };
  };
  cachedTags: {
    key: string;
    value: { id: string; tags: string[]; fetchedAt: number };
  };
}

const DB_NAME = 'accum-db';
const DB_VERSION = 1;

export async function getDb() {
  return openDB<AccumDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
      queueStore.createIndex('by-timestamp', 'timestamp');
      db.createObjectStore('cachedStudents', { keyPath: 'classId' });
      db.createObjectStore('cachedRecords', { keyPath: 'studentId' });
      db.createObjectStore('cachedTags', { keyPath: 'id' });
    },
  });
}

export async function addToQueue(item: OfflineQueueItem) {
  const db = await getDb();
  await db.put('offlineQueue', item);
}

export async function getQueueItems(): Promise<OfflineQueueItem[]> {
  const db = await getDb();
  return db.getAllFromIndex('offlineQueue', 'by-timestamp');
}

export async function removeFromQueue(id: string) {
  const db = await getDb();
  await db.delete('offlineQueue', id);
}

export async function getQueueCount(): Promise<number> {
  const db = await getDb();
  return db.count('offlineQueue');
}

export async function cacheStudents(classId: string, students: Student[]) {
  const db = await getDb();
  await db.put('cachedStudents', { classId, students, fetchedAt: Date.now() });
}

export async function getCachedStudents(classId: string): Promise<Student[] | null> {
  const db = await getDb();
  const cached = await db.get('cachedStudents', classId);
  if (!cached) return null;
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() - cached.fetchedAt > fiveMinutes) return null;
  return cached.students;
}

export async function cacheTags(tags: string[]) {
  const db = await getDb();
  await db.put('cachedTags', { id: 'tags', tags, fetchedAt: Date.now() });
}

export async function getCachedTags(): Promise<string[] | null> {
  const db = await getDb();
  const cached = await db.get('cachedTags', 'tags');
  if (!cached) return null;
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() - cached.fetchedAt > fiveMinutes) return null;
  return cached.tags;
}
