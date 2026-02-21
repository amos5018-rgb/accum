import type { Subject, ClassGroup, Student, StudentRecord } from '../types';

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string;

async function apiGet<T>(action: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), { redirect: 'follow' });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

async function apiPost<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    redirect: 'follow',
    body: JSON.stringify({ action, ...payload }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export const sheetsApi = {
  getSubjects: () => apiGet<Subject[]>('getSubjects'),

  getClasses: (subjectId?: string) =>
    apiGet<ClassGroup[]>('getClasses', subjectId ? { subjectId } : undefined),

  getStudents: (classId: string) =>
    apiGet<Student[]>('getStudents', { classId }),

  getRecords: (classId: string, studentId?: string) =>
    apiGet<StudentRecord[]>('getRecords', {
      classId,
      ...(studentId ? { studentId } : {}),
    }),

  getTags: () => apiGet<string[]>('getTags'),

  addRecord: (record: Omit<StudentRecord, 'recordId' | 'synced'>) =>
    apiPost<{ success: boolean; recordId: string }>('addRecord', { record }),

  addTag: (tag: string) =>
    apiPost<{ success: boolean }>('addTag', { tag }),

  addStudents: (classId: string, students: Array<{ number: number; name: string }>) =>
    apiPost<{ success: boolean }>('addStudents', { classId, students }),

  batchSync: (records: Array<Omit<StudentRecord, 'recordId' | 'synced'>>) =>
    apiPost<{ success: boolean; results: Array<{ recordId: string }> }>('batchSync', { records }),
};
