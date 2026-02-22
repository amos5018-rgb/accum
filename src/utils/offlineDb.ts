import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Subject, ClassGroup, Student, StudentRecord, OfflineQueueItem } from '../types';

interface AccumDB extends DBSchema {
  offlineQueue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-timestamp': number };
  };
  cachedInitData: {
    key: string;
    value: {
      id: string;
      subjects: Subject[];
      classes: ClassGroup[];
      tags: string[];
      fetchedAt: number;
    };
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
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<AccumDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AccumDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
          queueStore.createIndex('by-timestamp', 'timestamp');
          db.createObjectStore('cachedStudents', { keyPath: 'classId' });
          db.createObjectStore('cachedRecords', { keyPath: 'studentId' });
          db.createObjectStore('cachedTags', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('cachedInitData', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ===== 오프라인 큐 =====

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

// ===== 초기 데이터 캐시 (subjects + classes + tags) — TTL 없음 =====

export async function cacheInitData(subjects: Subject[], classes: ClassGroup[], tags: string[]) {
  const db = await getDb();
  await db.put('cachedInitData', { id: 'init', subjects, classes, tags, fetchedAt: Date.now() });
}

export async function getCachedInitData(): Promise<{ subjects: Subject[]; classes: ClassGroup[]; tags: string[] } | null> {
  const db = await getDb();
  const cached = await db.get('cachedInitData', 'init');
  if (!cached) return null;
  return { subjects: cached.subjects, classes: cached.classes, tags: cached.tags };
}

// ===== 학생 캐시 — TTL 없음 (stale-while-revalidate) =====

export async function cacheStudents(classId: string, students: Student[]) {
  const db = await getDb();
  await db.put('cachedStudents', { classId, students, fetchedAt: Date.now() });
}

export async function getCachedStudents(classId: string): Promise<Student[] | null> {
  const db = await getDb();
  const cached = await db.get('cachedStudents', classId);
  if (!cached) return null;
  return cached.students;
}

// ===== 기록 캐시 — TTL 없음 (stale-while-revalidate) =====

export async function cacheRecords(classId: string, studentId: string, records: StudentRecord[]) {
  const db = await getDb();
  const key = `${classId}_${studentId}`;
  await db.put('cachedRecords', { studentId: key, records, fetchedAt: Date.now() });
}

export async function getCachedRecords(classId: string, studentId: string): Promise<StudentRecord[] | null> {
  const db = await getDb();
  const cached = await db.get('cachedRecords', `${classId}_${studentId}`);
  if (!cached) return null;
  return cached.records;
}

// ===== 태그 캐시 — TTL 없음 =====

export async function cacheTags(tags: string[]) {
  const db = await getDb();
  await db.put('cachedTags', { id: 'tags', tags, fetchedAt: Date.now() });
}

export async function getCachedTags(): Promise<string[] | null> {
  const db = await getDb();
  const cached = await db.get('cachedTags', 'tags');
  if (!cached) return null;
  return cached.tags;
}
