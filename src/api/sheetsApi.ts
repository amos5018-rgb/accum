import type { Subject, ClassGroup, Student, StudentRecord } from '../types';

function getApiUrl(): string {
  return localStorage.getItem('appsScriptUrl')
    || (import.meta.env.VITE_APPS_SCRIPT_URL as string)
    || '';
}

async function apiGet<T>(action: string, params?: Record<string, string>): Promise<T> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error('Apps Script URL이 설정되지 않았습니다.');
  const url = new URL(apiUrl);
  url.searchParams.set('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), { redirect: 'follow' });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

async function apiPost<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error('Apps Script URL이 설정되지 않았습니다.');
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    redirect: 'follow',
    body: JSON.stringify({ action, ...payload }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export const sheetsApi = {
  getInitData: () =>
    apiGet<{ subjects: Subject[]; classes: ClassGroup[]; tags: string[] }>('getInitData'),

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

  addSubject: (subject: { subjectId: string; subjectName: string }) =>
    apiPost<{ success: boolean }>('addSubject', { subject }),

  addClass: (classGroup: { classId: string; subjectId: string; grade: number; className: string }) =>
    apiPost<{ success: boolean }>('addClass', { classGroup }),

  addStudents: (classId: string, students: Array<{ number: number; name: string }>) =>
    apiPost<{ success: boolean }>('addStudents', { classId, students }),

  batchSync: (records: Array<Omit<StudentRecord, 'recordId' | 'synced'>>) =>
    apiPost<{ success: boolean; results: Array<{ recordId: string }> }>('batchSync', { records }),
};
