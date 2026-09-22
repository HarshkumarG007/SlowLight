import { Suspense, lazy } from 'react';

const WorldCanvas = lazy(() => import('../three/WorldCanvas.js').then(module => ({ default: module.WorldCanvas })));

export function App() {
  return (
    <>
      <Suspense fallback={null}>
        <WorldCanvas />
      </Suspense>
      <div className="veil-placeholder" style={{ position: 'relative', zIndex: 1, pointerEvents: 'none', color: 'white', padding: 20 }}>
        <h1 style={{ pointerEvents: 'auto' }}>Slow Light</h1>
      </div>
    </>
  );
}
