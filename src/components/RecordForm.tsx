import { useState } from 'react';
import styles from '../styles/RecordForm.module.css';

interface RecordFormProps {
  tags: string[];
  onSubmit: (content: string, tags: string[]) => void;
  onAddTag: (tag: string) => void;
}

export default function RecordForm({ tags, onSubmit, onAddTag }: RecordFormProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setNewTag('');
      setShowTagInput(false);
      return;
    }
    onAddTag(trimmed);
    setSelectedTags((prev) => [...prev, trimmed]);
    setNewTag('');
    setShowTagInput(false);
  };

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed, selectedTags);
    setContent('');
    setSelectedTags([]);
  };

  return (
    <div className={styles.form}>
      <div className={styles.tagSection}>
        <div className={styles.tagList}>
          {tags.map((tag) => (
            <button
              key={tag}
              className={`${styles.tag} ${selectedTags.includes(tag) ? styles.tagSelected : ''}`}
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
            </button>
          ))}
          {showTagInput ? (
            <div className={styles.tagInputWrap}>
              <input
                className={styles.tagInput}
                type="text"
                placeholder="태그명"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') {
                    setShowTagInput(false);
                    setNewTag('');
                  }
                }}
                autoFocus
              />
              <button className={styles.tagInputConfirm} onClick={handleAddTag}>
                &#10003;
              </button>
            </div>
          ) : (
            <button
              className={styles.addTagBtn}
              onClick={() => setShowTagInput(true)}
            >
              + 태그
            </button>
          )}
        </div>
      </div>

      <textarea
        className={styles.textarea}
        placeholder="관찰 내용을 입력하세요..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
      />

      <button
        className={`${styles.submitBtn} ${!content.trim() ? styles.submitBtnDisabled : ''}`}
        onClick={handleSubmit}
        disabled={!content.trim()}
      >
        기록 저장
      </button>
    </div>
  );
}
