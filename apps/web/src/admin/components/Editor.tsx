import { useState } from 'react';
import styles from './AdminComponents.module.css';

// Using mock encryption for the UI to represent the sealed.ts functionality
// In reality, this would use the `seal()` function from `apps/api/src/crypto/sealed.ts`
// but the browser cannot import from `apps/api`. The browser would need to fetch
// the public key or use an endpoint, but the spec says "Sealed text fields via AES-256-GCM + KMS envelope".
// Wait, if KMS is used, the backend handles encryption, or the frontend does with WebCrypto?
// Spec: "No secrets in the frontend". Thus, the frontend sends plaintext over TLS, and the backend seals it.
// We will just send plaintext and the API handles the sealing.

type ContentType = 'memory' | 'chapter' | 'letter' | 'future' | 'site_text';

export function Editor() {
  const [contentType, setContentType] = useState<ContentType>('memory');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  
  const handleSave = async () => {
    // Stub save function - in production, calls /api/v1/admin/content
    alert(`Content for ${contentType} (${title}) saved`);
  };

  return (
    <div className={styles.panel}>
      <h2>Content Editor</h2>
      
      <div className={styles.formGroup}>
        <label>Type</label>
        <select value={contentType} onChange={e => setContentType(e.target.value as ContentType)}>
          <option value="memory">Memory</option>
          <option value="chapter">Chapter</option>
          <option value="letter">Letter</option>
          <option value="future">Future Entry</option>
          <option value="site_text">Site Text</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label>Title</label>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter title..."
        />
      </div>

      <div className={styles.formGroup}>
        <label>Body Content (SL-Text)</label>
        <textarea 
          value={content} 
          onChange={e => setContent(e.target.value)}
          rows={10}
          placeholder="Enter content using SL-Text format..."
        />
      </div>

      <button className={styles.primaryBtn} onClick={handleSave}>
        Save Content
      </button>
    </div>
  );
}
