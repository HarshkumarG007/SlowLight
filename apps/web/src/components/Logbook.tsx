import { useState, useEffect } from 'react';
import styles from './Logbook.module.css';

export interface LogbookProps {
  onClose: () => void;
  onOpenMemory: (id: string) => void;
}

export function Logbook({ onClose, onOpenMemory }: LogbookProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debounced search mock
    const timer = setTimeout(() => {
      setLoading(true);
      // Simulate API call to /archive/search?q=query
      setTimeout(() => {
        setResults([
          { id: '1', title: 'A quiet morning', occurredOn: '2025-10-12', snippet: { text: '...the sun rose over the...', matches: [] } }
        ]);
        setLoading(false);
      }, 400);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h1 className={styles.title}>The Logbook</h1>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className={styles.searchBar}>
          <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            className={styles.searchInput}
            placeholder="Search memories..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.content}>
          {loading && <div className={styles.status}>Searching...</div>}
          {!loading && results.length === 0 && <div className={styles.status}>No memories found.</div>}
          {!loading && results.length > 0 && (
            <ul className={styles.resultList}>
              {results.map(r => (
                <li key={r.id} className={styles.resultItem} onClick={() => onOpenMemory(r.id)}>
                  <div className={styles.resultMeta}>{new Date(r.occurredOn).toLocaleDateString()}</div>
                  <h3 className={styles.resultTitle}>{r.title}</h3>
                  <p className={styles.resultSnippet}>{r.snippet.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
