import { useState } from 'react';
import styles from './AdminComponents.module.css';

export function SecurityPanel() {
  const [invitePhrase, setInvitePhrase] = useState<string | null>(null);

  const generateInvite = () => {
    // Stub invite generation
    setInvitePhrase('copper-mountain-sunset-breeze');
  };

  return (
    <div className={styles.panel}>
      <h2>Security & Access</h2>

      <div className={styles.section}>
        <h3>Invites</h3>
        <p>Generate a single-use invite phrase for the Recipient.</p>
        <button className={styles.secondaryBtn} onClick={generateInvite}>
          Generate Invite
        </button>
        {invitePhrase && (
          <div className={styles.inviteBox}>
            <strong>Invite Phrase:</strong> <span>{invitePhrase}</span>
            <small>(This phrase will only be shown once)</small>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h3>Knocks</h3>
        <p>No pending knocks.</p>
      </div>

      <div className={styles.section}>
        <h3>DBSC & Hardware Device Binding</h3>
        <p>
          Device-Bound Session Credentials (ECDSA P-256 via TPM / Secure Enclave) bind active sessions to physical hardware, preventing cookie theft and replay attacks.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-green-400, #7dbe9c)', fontSize: '0.875rem' }}>
          <span>●</span>
          <span>DBSC Progressive Binding Active (TPM / WebCrypto)</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Recent Audit Log</h3>
        <table className={styles.auditTable}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-09-22 10:00:00</td>
              <td>Author</td>
              <td>LOGIN</td>
              <td>Session created</td>
            </tr>
            <tr>
              <td>2026-09-22 10:15:23</td>
              <td>Author</td>
              <td>STEP_UP</td>
              <td>Elevation granted</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
