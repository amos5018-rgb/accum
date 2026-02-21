import { useState } from 'react';
import { formatDateTime } from '../utils/dateUtils';
import type { StudentRecord } from '../types';
import styles from '../styles/RecordItem.module.css';

interface RecordItemProps {
  record: StudentRecord;
}

export default function RecordItem({ record }: RecordItemProps) {
  const [expanded, setExpanded] = useState(false);

  const isLong = record.content.length > 80;
  const displayContent = isLong && !expanded
    ? record.content.slice(0, 80) + '...'
    : record.content;

  return (
    <div
      className={`${styles.item} ${!record.synced ? styles.itemPending : ''}`}
      onClick={() => isLong && setExpanded(!expanded)}
    >
      <div className={styles.header}>
        <span className={styles.date}>{formatDateTime(record.createdAt)}</span>
        {!record.synced && <span className={styles.pendingBadge}>대기</span>}
      </div>
      {record.tags.length > 0 && (
        <div className={styles.tags}>
          {record.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className={styles.content}>{displayContent}</p>
    </div>
  );
}
