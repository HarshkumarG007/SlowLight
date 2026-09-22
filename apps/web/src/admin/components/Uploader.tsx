import { useState } from 'react';
import styles from './AdminComponents.module.css';

export function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]!);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');

    // Stub: Request presigned POST url
    // const { url, fields } = await fetch('/admin/media/upload').then(res => res.json());
    
    // Stub: Upload to S3 quarantine
    // const formData = new FormData();
    // formData.append('file', file);
    // await fetch(url, { method: 'POST', body: formData });
    
    // Stub: Polling API for worker status
    setTimeout(() => setUploadStatus('processing'), 1000);
    setTimeout(() => setUploadStatus('ready'), 3000);
  };

  return (
    <div className={styles.panel}>
      <h2>Media Uploader</h2>
      
      <div className={styles.formGroup}>
        <label>Select File</label>
        <input type="file" onChange={handleFileChange} accept="image/*,video/*,audio/*" />
      </div>

      {file && (
        <div className={styles.fileInfo}>
          Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </div>
      )}

      <button 
        className={styles.primaryBtn} 
        onClick={handleUpload} 
        disabled={!file || uploadStatus === 'uploading' || uploadStatus === 'processing'}
      >
        Upload File
      </button>

      {uploadStatus !== 'idle' && (
        <div className={styles.statusBox}>
          Status: <strong>{uploadStatus}</strong>
        </div>
      )}
    </div>
  );
}
