import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { sheetsApi } from '../api/sheetsApi';
import { cacheStudents, getCachedStudents } from '../utils/offlineDb';
import type { Student } from '../types';
import styles from '../styles/ClassPage.module.css';

export default function ClassPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const classInfo = state.classes.find((c) => c.classId === classId);

  useEffect(() => {
    if (!classId) return;

    async function load() {
      try {
        // 캐시 먼저 확인
        const cached = await getCachedStudents(classId!);
        if (cached) {
          setStudents(cached);
          setLoading(false);
        }

        // 네트워크에서 가져오기
        const data = await sheetsApi.getStudents(classId!);
        setStudents(data);
        await cacheStudents(classId!, data);
      } catch {
        // 오프라인이면 캐시만 사용
        if (students.length === 0) {
          const cached = await getCachedStudents(classId!);
          if (cached) setStudents(cached);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [classId]);

  const filtered = search
    ? students.filter(
        (s) =>
          s.studentName.includes(search) ||
          String(s.studentNumber).includes(search)
      )
    : students;

  const handleStudentClick = (student: Student) => {
    navigate(`/class/${classId}/student/${student.studentId}`);
  };

  const title = classInfo?.className || '학생 목록';

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
        {students.length > 10 && (
          <div className={styles.searchBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="이름 또는 번호 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            {students.length === 0
              ? '등록된 학생이 없습니다'
              : '검색 결과가 없습니다'}
          </div>
        ) : (
          <div className={styles.studentList}>
            {filtered.map((student) => (
              <button
                key={student.studentId}
                className={styles.studentItem}
                onClick={() => handleStudentClick(student)}
              >
                <span className={styles.studentNumber}>
                  {String(student.studentNumber).padStart(2, '0')}
                </span>
                <span className={styles.studentName}>
                  {student.studentName}
                </span>
                <span className={styles.arrow}>&#8250;</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
