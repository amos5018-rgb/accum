export interface Subject {
  subjectId: string;
  subjectName: string;
}

export interface ClassGroup {
  classId: string;
  subjectId: string;
  grade: number;
  className: string;
}

export interface Student {
  studentId: string;
  classId: string;
  studentNumber: number;
  studentName: string;
}

export interface StudentRecord {
  recordId: string;
  studentId: string;
  studentNumber: number;
  studentName: string;
  classId: string;
  tags: string[];
  content: string;
  createdAt: string;
  synced: boolean;
}

export interface OfflineQueueItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Partial<StudentRecord>;
  timestamp: number;
  retryCount: number;
}
