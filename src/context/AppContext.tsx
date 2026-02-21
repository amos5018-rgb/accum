import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Subject, ClassGroup } from '../types';
import { sheetsApi } from '../api/sheetsApi';
import { getQueueItems, removeFromQueue, getQueueCount } from '../utils/offlineDb';

interface AppState {
  subjects: Subject[];
  classes: ClassGroup[];
  tags: string[];
  selectedSubject: Subject | null;
  selectedClass: ClassGroup | null;
  isOnline: boolean;
  pendingCount: number;
}

type AppAction =
  | { type: 'SET_SUBJECTS'; payload: Subject[] }
  | { type: 'SET_CLASSES'; payload: ClassGroup[] }
  | { type: 'SET_TAGS'; payload: string[] }
  | { type: 'ADD_TAG'; payload: string }
  | { type: 'SELECT_SUBJECT'; payload: Subject | null }
  | { type: 'SELECT_CLASS'; payload: ClassGroup | null }
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_PENDING_COUNT'; payload: number };

const initialState: AppState = {
  subjects: [],
  classes: [],
  tags: [],
  selectedSubject: null,
  selectedClass: null,
  isOnline: navigator.onLine,
  pendingCount: 0,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SUBJECTS':
      return { ...state, subjects: action.payload };
    case 'SET_CLASSES':
      return { ...state, classes: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload] };
    case 'SELECT_SUBJECT':
      return { ...state, selectedSubject: action.payload, selectedClass: null };
    case 'SELECT_CLASS': {
      if (action.payload) {
        localStorage.setItem('lastClassId', action.payload.classId);
      }
      return { ...state, selectedClass: action.payload };
    }
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    case 'SET_PENDING_COUNT':
      return { ...state, pendingCount: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE', payload: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <SyncManager />
      {children}
    </AppContext.Provider>
  );
}

function SyncManager() {
  const { dispatch } = useAppContext();
  const syncingRef = useRef(false);

  const syncPendingRecords = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const items = await getQueueItems();
      if (items.length === 0) return;
      const createItems = items.filter((item) => item.action === 'CREATE');
      if (createItems.length > 0) {
        const records = createItems.map((item) => item.payload);
        await sheetsApi.batchSync(records as Parameters<typeof sheetsApi.batchSync>[0]);
        for (const item of createItems) {
          await removeFromQueue(item.id);
        }
      }
      const count = await getQueueCount();
      dispatch({ type: 'SET_PENDING_COUNT', payload: count });
    } catch {
      // 네트워크 오류 - 다음에 재시도
    } finally {
      syncingRef.current = false;
    }
  }, [dispatch]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncPendingRecords();
    };
    const handleOnline = () => syncPendingRecords();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    syncPendingRecords();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [syncPendingRecords]);

  return null;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
