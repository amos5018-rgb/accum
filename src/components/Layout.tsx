import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import styles from '../styles/Layout.module.css';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAppContext();
  const isHome = location.pathname === '/';

  const handleBack = () => {
    const path = location.pathname;
    // /class/:classId/student/:studentId → /class/:classId
    const studentMatch = path.match(/^\/class\/([^/]+)\/student\//);
    if (studentMatch) {
      navigate(`/class/${studentMatch[1]}`);
      return;
    }
    // /class/:classId → / (홈으로 돌아갈 때 자동이동 방지)
    if (path.startsWith('/class/')) {
      localStorage.removeItem('lastClassId');
      navigate('/');
      return;
    }
    // 그 외 (/settings 등) → /
    navigate('/');
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        {!isHome && (
          <button className={styles.backBtn} onClick={handleBack}>
            &#8592;
          </button>
        )}
        <h1 className={styles.title}>{title || '누가기록'}</h1>
        {isHome && (
          <button className={styles.settingsBtn} onClick={() => navigate('/settings')}>
            &#9881;
          </button>
        )}
      </header>
      {!state.isOnline && (
        <div className={styles.offlineBanner}>
          오프라인 {state.pendingCount > 0 && `- ${state.pendingCount}건 동기화 대기 중`}
        </div>
      )}
      <main className={styles.content}>{children}</main>
    </div>
  );
}
