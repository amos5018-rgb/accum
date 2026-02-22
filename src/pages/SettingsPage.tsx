import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import { useAppContext } from '../context/AppContext';
import { sheetsApi } from '../api/sheetsApi';
import { getQueueItems, removeFromQueue, getQueueCount } from '../utils/offlineDb';
import { parseStudentFile } from '../utils/csvParser';
import type { Subject, ClassGroup } from '../types';
import styles from '../styles/SettingsPage.module.css';

export default function SettingsPage() {
  const { state, dispatch } = useAppContext();
  const [scriptUrl, setScriptUrl] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // 과목/학급 추가
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newClassSubjectId, setNewClassSubjectId] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('1');

  // 학생 임포트
  const [importClassId, setImportClassId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('appsScriptUrl');
    if (saved) setScriptUrl(saved);
    loadPendingCount();
  }, []);

  async function loadPendingCount() {
    const count = await getQueueCount();
    setPendingCount(count);
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSaveUrl = () => {
    const trimmed = scriptUrl.trim();
    if (!trimmed) return;
    localStorage.setItem('appsScriptUrl', trimmed);
    showToast('URL이 저장되었습니다', 'success');
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const items = await getQueueItems();
      if (items.length === 0) {
        showToast('동기화할 항목이 없습니다', 'success');
        return;
      }

      const records = items
        .filter((item) => item.action === 'CREATE')
        .map((item) => item.payload);

      await sheetsApi.batchSync(records as Parameters<typeof sheetsApi.batchSync>[0]);

      for (const item of items) {
        await removeFromQueue(item.id);
      }

      const count = await getQueueCount();
      setPendingCount(count);
      dispatch({ type: 'SET_PENDING_COUNT', payload: count });
      showToast(`${items.length}건 동기화 완료`, 'success');
    } catch {
      showToast('동기화에 실패했습니다', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectId.trim() || !newSubjectName.trim()) return;
    const subject: Subject = {
      subjectId: newSubjectId.trim(),
      subjectName: newSubjectName.trim(),
    };
    dispatch({ type: 'SET_SUBJECTS', payload: [...state.subjects, subject] });
    setNewSubjectId('');
    setNewSubjectName('');
    showToast('과목이 추가되었습니다', 'success');
    try {
      await sheetsApi.addSubject(subject);
    } catch {
      // 오프라인 시 로컬에만 추가
    }
  };

  const handleAddClass = async () => {
    if (!newClassId.trim() || !newClassName.trim() || !newClassSubjectId) return;
    const cls: ClassGroup = {
      classId: newClassId.trim(),
      subjectId: newClassSubjectId,
      grade: Number(newClassGrade),
      className: newClassName.trim(),
    };
    dispatch({ type: 'SET_CLASSES', payload: [...state.classes, cls] });
    setNewClassId('');
    setNewClassName('');
    showToast('학급이 추가되었습니다', 'success');
    try {
      await sheetsApi.addClass(cls);
    } catch {
      // 오프라인 시 로컬에만 추가
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importClassId) return;

    try {
      const students = await parseStudentFile(file);
      if (students.length === 0) {
        showToast('학생 데이터를 찾을 수 없습니다', 'error');
        return;
      }

      await sheetsApi.addStudents(importClassId, students);
      showToast(`${students.length}명 등록 완료`, 'success');
    } catch {
      showToast('파일 처리 중 오류가 발생했습니다', 'error');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Layout title="설정">
      <div className={styles.container}>
        {/* Apps Script URL */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Google Apps Script URL</h2>
          <p className={styles.sectionDesc}>
            스프레드시트에서 배포한 웹 앱 URL을 입력하세요.
          </p>
          <input
            className={styles.input}
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={scriptUrl}
            onChange={(e) => setScriptUrl(e.target.value)}
          />
          <button className={styles.primaryBtn} onClick={handleSaveUrl}>
            저장
          </button>
        </section>

        {/* 동기화 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>데이터 동기화</h2>
          <p className={styles.sectionDesc}>
            대기 중: {pendingCount}건
          </p>
          <button
            className={styles.primaryBtn}
            onClick={handleManualSync}
            disabled={syncing || pendingCount === 0}
          >
            {syncing ? '동기화 중...' : '수동 동기화'}
          </button>
        </section>

        {/* 과목 추가 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>과목 추가</h2>
          <div className={styles.row}>
            <input
              className={styles.inputSmall}
              placeholder="ID (예: KOR)"
              value={newSubjectId}
              onChange={(e) => setNewSubjectId(e.target.value)}
            />
            <input
              className={styles.inputSmall}
              placeholder="이름 (예: 국어)"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
            />
            <button className={styles.addBtn} onClick={handleAddSubject}>
              추가
            </button>
          </div>
          {state.subjects.length > 0 && (
            <div className={styles.chipList}>
              {state.subjects.map((s) => (
                <span key={s.subjectId} className={styles.chip}>
                  {s.subjectName}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* 학급 추가 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>학급 추가</h2>
          <div className={styles.row}>
            <select
              className={styles.select}
              value={newClassSubjectId}
              onChange={(e) => setNewClassSubjectId(e.target.value)}
            >
              <option value="">과목 선택</option>
              {state.subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={newClassGrade}
              onChange={(e) => setNewClassGrade(e.target.value)}
            >
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
          <div className={styles.row}>
            <input
              className={styles.inputSmall}
              placeholder="ID (예: KOR1-3)"
              value={newClassId}
              onChange={(e) => setNewClassId(e.target.value)}
            />
            <input
              className={styles.inputSmall}
              placeholder="이름 (예: 1학년 3반)"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
            />
            <button className={styles.addBtn} onClick={handleAddClass}>
              추가
            </button>
          </div>
        </section>

        {/* 학생 임포트 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>학생 명단 가져오기</h2>
          <p className={styles.sectionDesc}>
            엑셀 파일(.xlsx)에서 번호, 이름 열을 읽어옵니다.
          </p>
          <select
            className={styles.select}
            value={importClassId}
            onChange={(e) => setImportClassId(e.target.value)}
          >
            <option value="">학급 선택</option>
            {state.classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.className}
              </option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className={styles.fileInput}
            onChange={handleFileImport}
            disabled={!importClassId}
          />
        </section>

        {/* 홈 화면 추가 안내 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>홈 화면에 추가</h2>
          <p className={styles.sectionDesc}>
            Safari에서 공유 버튼(&#9997;)을 누른 후 "홈 화면에 추가"를 선택하면
            앱처럼 사용할 수 있습니다.
          </p>
        </section>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </Layout>
  );
}
