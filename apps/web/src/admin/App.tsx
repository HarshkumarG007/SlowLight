import { useState } from 'react';
import styles from './App.module.css';
import { Editor } from './components/Editor';
import { Uploader } from './components/Uploader';
import { SecurityPanel } from './components/SecurityPanel';
import { RepliesViewer } from './components/RepliesViewer';

export function App() {
  const [activeTab, setActiveTab] = useState<'content' | 'media' | 'security' | 'replies'>('content');

  return (
    <div className={styles.adminLayout}>
      <header className={styles.header}>
        <h1>Slow Light Admin</h1>
        <nav className={styles.nav}>
          <button 
            className={activeTab === 'content' ? styles.active : ''} 
            onClick={() => setActiveTab('content')}
          >
            Content
          </button>
          <button 
            className={activeTab === 'media' ? styles.active : ''} 
            onClick={() => setActiveTab('media')}
          >
            Media
          </button>
          <button 
            className={activeTab === 'replies' ? styles.active : ''} 
            onClick={() => setActiveTab('replies')}
          >
            Replies
          </button>
          <button 
            className={activeTab === 'security' ? styles.active : ''} 
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        {activeTab === 'content' && <Editor />}
        {activeTab === 'media' && <Uploader />}
        {activeTab === 'replies' && <RepliesViewer />}
        {activeTab === 'security' && <SecurityPanel />}
      </main>
    </div>
  );
}
