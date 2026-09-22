import { useState } from 'react';
import styles from './App.module.css';
import { Editor } from './components/Editor';
import { Uploader } from './components/Uploader';
import { SecurityPanel } from './components/SecurityPanel';

export function App() {
  const [activeTab, setActiveTab] = useState<'content' | 'media' | 'security'>('content');

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
        {activeTab === 'security' && <SecurityPanel />}
      </main>
    </div>
  );
}
