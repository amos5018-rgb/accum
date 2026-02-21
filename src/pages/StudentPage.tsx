import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import RecordForm from '../components/RecordForm';
import RecordItem from '../components/RecordItem';
import Toast from '../components/Toast';
import { useAppContext } from '../context/AppContext';
import { sheetsApi } from '../api/sheetsApi';
import { addToQueue, getQueueCount, getCachedStudents } from '../utils/offlineDb';
import { nowISO } from '../utils/dateUtils';
import type { Student, StudentRecord } from '../types';
import styles from '../styles/StudentPage.module.css';

export default function StudentPage() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  const { state, dispatch } = useAppContext();
  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!classId || !studentId) return;

    async function load() {
      // 학생 정보: ClassPage에서 캐시한 데이터에서 즉시 조회 (네트워크 호출 제거)
      try {
        const cached = await getCachedStudents(classId!);
        if (cached) {
          const found = cached.find((s) => s.studentId === studentId);
          if (found) setStudent(found);
        }
      } catch {
        // 캐시 실패 무시
      }

      // 기록만 네트워크에서 조회
      try {
        const recs = await sheetsApi.getRecords(classId!, studentId);
        setRecords(recs);
      } catch {
        // 오프라인
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [classId, studentId]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSubmit = async (content: string, tags: string[]) => {
    if (!student || !classId) return;

    const record: Omit<StudentRecord, 'recordId' | 'synced'> = {
      studentId: student.studentId,
      studentNumber: student.studentNumber,
      studentName: student.studentName,
      classId,
      tags,
      content,
      createdAt: nowISO(),
    };

    // 낙관적 UI 업데이트
    const tempRecord: StudentRecord = {
      ...record,
      recordId: 'temp-' + Date.now(),
      synced: false,
    };
    setRecords((prev) => [tempRecord, ...prev]);
    showToast('기록이 저장되었습니다', 'success');

    try {
      const result = await sheetsApi.addRecord(record);
      // 동기화 성공 - temp를 실제 ID로 교체
      setRecords((prev) =>
        prev.map((r) =>
          r.recordId === tempRecord.recordId
            ? { ...r, recordId: result.recordId, synced: true }
            : r
        )
      );
    } catch {
      // 오프라인 - 큐에 추가
      await addToQueue({
        id: tempRecord.recordId,
        action: 'CREATE',
        payload: record,
        timestamp: Date.now(),
        retryCount: 0,
      });
      const count = await getQueueCount();
      dispatch({ type: 'SET_PENDING_COUNT', payload: count });
    }
  };

  const title = student
    ? `${student.studentName} (${String(student.studentNumber).padStart(2, '0')}번)`
    : '학생 기록';

  if (loading) {
    return (
      <Layout title={title}>
        <div className={styles.loading}>불러오는 중...</div>
      </Layout>
    );
  }

  return (
    <Layout title={title}>
      <div className={styles.container}>
        <RecordForm
          tags={state.tags}
          onSubmit={handleSubmit}
          onAddTag={async (tag) => {
            dispatch({ type: 'ADD_TAG', payload: tag });
            try {
              await sheetsApi.addTag(tag);
            } catch {
              // 오프라인시 로컬에만 추가
            }
          }}
        />

        <div className={styles.recordSection}>
          <p className={styles.sectionTitle}>
            기록 내역 ({records.length}건)
          </p>
          {records.length === 0 ? (
            <div className={styles.empty}>아직 기록이 없습니다</div>
          ) : (
            <div className={styles.recordList}>
              {records.map((record) => (
                <RecordItem key={record.recordId} record={record} />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </Layout>
  );
}
