import { useEffect, useRef, useState } from 'react';
import { Engine } from './Engine.js';
import { bus, QualityTier } from './bus.js';
import { getSyntheticWorld } from './seed.js';

export function WorldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tier, setTier] = useState<QualityTier>('high'); // We could read from localStorage here
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Read saved tier
    const savedTier = localStorage.getItem('sl_tier') as QualityTier | null;
    const initialTier = savedTier || 'high';
    setTier(initialTier);

    const engine = new Engine(canvasRef.current, initialTier);

    const unsubReady = bus.onEvent((e) => {
      if (e.type === 'ready') {
        setReady(true);
        // Look-dev spike: feed synthetic world data
        bus.sendCommand({
          type: 'setWorld',
          data: getSyntheticWorld('dev-seed-1'),
        });
      }
      if (e.type === 'tierChanged') setTier(e.tier);
    });

    return () => {
      unsubReady();
      engine.dispose();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#050814', // Fallback void color
        zIndex: 0, // Behind React UI layer
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none', // Critical for custom pointer/wheel handling
        }}
      />
      {!ready && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff' }}>
          Loading Sky...
        </div>
      )}
      {/* Dev HUD overlay */}
      <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', fontSize: '10px', pointerEvents: 'none' }}>
        Tier: {tier}
      </div>
    </div>
  );
}
