import styles from '../styles/Toast.module.css';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

export default function Toast({ message, type }: ToastProps) {
  return (
    <div className={`${styles.toast} ${type === 'error' ? styles.error : styles.success}`}>
      {message}
    </div>
  );
}
