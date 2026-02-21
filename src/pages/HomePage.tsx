import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { sheetsApi } from '../api/sheetsApi';
import { getCachedInitData, cacheInitData } from '../utils/offlineDb';
import type { ClassGroup } from '../types';
import styles from '../styles/HomePage.module.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [filteredClasses, setFilteredClasses] = useState<ClassGroup[]>([]);

  useEffect(() => {
    let navigated = false;

    function applyData(
      subjects: typeof state.subjects,
      classes: typeof state.classes,
      tags: string[]
    ) {
      dispatch({ type: 'SET_SUBJECTS', payload: subjects });
      dispatch({ type: 'SET_CLASSES', payload: classes });
      dispatch({ type: 'SET_TAGS', payload: tags });
      setLoading(false);

      // 마지막 사용 학급 복원 (최초 1회만)
      if (!navigated) {
        const lastClassId = localStorage.getItem('lastClassId');
        if (lastClassId) {
          const lastClass = classes.find((c) => c.classId === lastClassId);
          if (lastClass) {
            const subject = subjects.find((s) => s.subjectId === lastClass.subjectId);
            if (subject) {
              dispatch({ type: 'SELECT_SUBJECT', payload: subject });
              dispatch({ type: 'SELECT_CLASS', payload: lastClass });
              navigate(`/class/${lastClass.classId}`);
              navigated = true;
            }
          }
        }
      }
    }

    async function load() {
      // 1단계: 캐시에서 즉시 표시
      try {
        const cached = await getCachedInitData();
        if (cached) {
          applyData(cached.subjects, cached.classes, cached.tags);
        }
      } catch {
        // 캐시 읽기 실패 무시
      }

      // 2단계: 네트워크에서 최신 데이터 갱신 (백그라운드)
      try {
        const { subjects, classes, tags } = await sheetsApi.getInitData();
        applyData(subjects, classes, tags);
        await cacheInitData(subjects, classes, tags);
      } catch {
        // 오프라인이면 캐시만 사용
        setLoading(false);
      }
    }
    load();
  }, [dispatch, navigate]);

  useEffect(() => {
    if (state.selectedSubject) {
      setFilteredClasses(
        state.classes.filter((c) => c.subjectId === state.selectedSubject!.subjectId)
      );
    } else {
      setFilteredClasses([]);
    }
  }, [state.selectedSubject, state.classes]);

  const handleSubjectClick = (subject: typeof state.subjects[0]) => {
    if (state.selectedSubject?.subjectId === subject.subjectId) {
      dispatch({ type: 'SELECT_SUBJECT', payload: null });
    } else {
      dispatch({ type: 'SELECT_SUBJECT', payload: subject });
    }
  };

  const handleClassClick = (cls: ClassGroup) => {
    dispatch({ type: 'SELECT_CLASS', payload: cls });
    navigate(`/class/${cls.classId}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>불러오는 중...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <p className={styles.sectionTitle}>과목</p>
        {state.subjects.length === 0 ? (
          <div className={styles.empty}>
            설정에서 과목과 학급을 추가해주세요
          </div>
        ) : (
          <div className={styles.subjectGrid}>
            {state.subjects.map((subject) => (
              <button
                key={subject.subjectId}
                className={`${styles.subjectCard} ${
                  state.selectedSubject?.subjectId === subject.subjectId
                    ? styles.subjectCardSelected
                    : ''
                }`}
                onClick={() => handleSubjectClick(subject)}
              >
                {subject.subjectName}
              </button>
            ))}
          </div>
        )}

        {state.selectedSubject && (
          <>
            <p className={styles.sectionTitle}>
              {state.selectedSubject.subjectName} 학급
            </p>
            {filteredClasses.length === 0 ? (
              <div className={styles.empty}>등록된 학급이 없습니다</div>
            ) : (
              <div className={styles.classList}>
                {filteredClasses.map((cls) => (
                  <button
                    key={cls.classId}
                    className={styles.classItem}
                    onClick={() => handleClassClick(cls)}
                  >
                    <span className={styles.className}>{cls.className}</span>
                    <span className={styles.classArrow}>&#8250;</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
