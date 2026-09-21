import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';

export function Enrollment() {
  const [token, setToken] = useState('');
  const [phrase, setPhrase] = useState('');
  const [status, setStatus] = useState('Idle');

  useEffect(() => {
    // Read the fragment token e.g. #t=123
    const hash = window.location.hash;
    if (hash.startsWith('#t=')) {
      setToken(hash.slice(3));
    }
  }, []);

  const handleEnroll = async () => {
    setStatus('Beginning enrollment...');
    try {
      const res = await fetch('/api/auth/enrollment/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phrase })
      });
      if (!res.ok) throw new Error('Invalid invite or phrase');
      
      const options = await res.json();
      
      setStatus('Waiting for passkey...');
      const response = await startRegistration({ optionsJSON: options });
      
      setStatus('Verifying passkey...');
      const verifyRes = await fetch('/api/auth/enrollment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, response })
      });
      if (!verifyRes.ok) throw new Error('Verification failed');
      
      setStatus('Success! You are now enrolled.');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', border: '1px solid #444', borderRadius: '8px' }}>
      <h2>Enroll Device</h2>
      <p>Status: {status}</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          placeholder="Token (usually from URL fragment)" 
          value={token} 
          onChange={(e) => setToken(e.target.value)} 
          readOnly
        />
        <input 
          placeholder="5-word phrase" 
          value={phrase} 
          onChange={(e) => setPhrase(e.target.value)} 
        />
        <button onClick={handleEnroll}>Enroll Passkey</button>
      </div>
    </div>
  );
}
