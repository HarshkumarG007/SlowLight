import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { registerDeviceBoundSession } from '../../lib/dbsc';
import { registerE2EEPublicKey } from '../../lib/e2ee';

export function Login() {
  const [status, setStatus] = useState('Idle');

  const handleLogin = async () => {
    setStatus('Fetching options...');
    try {
      const res = await fetch('/api/auth/login/options');
      if (!res.ok) throw new Error('Could not get login options');
      
      const options = await res.json();
      
      setStatus('Waiting for passkey...');
      const response = await startAuthentication({ optionsJSON: options });
      
      setStatus('Verifying passkey...');
      const verifyRes = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      });
      if (!verifyRes.ok) throw new Error('Login failed');
      
      // Progressive DBSC hardware device binding
      void registerDeviceBoundSession();

      // Progressive Sealed Vault v2 E2EE enrollment
      void registerE2EEPublicKey();

      setStatus('Success! You are now logged in.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setStatus(`Error: ${message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', border: '1px solid #444', borderRadius: '8px', marginTop: '20px' }}>
      <h2>Login</h2>
      <p>Status: {status}</p>
      
      <button onClick={handleLogin}>Log In with Passkey</button>
    </div>
  );
}
