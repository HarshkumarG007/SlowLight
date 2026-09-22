import { WorldCanvas } from '../three/WorldCanvas.js';

export function App() {
  return (
    <>
      <WorldCanvas />
      <div className="veil-placeholder" style={{ position: 'relative', zIndex: 1, pointerEvents: 'none', color: 'white', padding: 20 }}>
        <h1 style={{ pointerEvents: 'auto' }}>Slow Light</h1>
      </div>
    </>
  );
}
