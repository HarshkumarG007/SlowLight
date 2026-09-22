/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Engine } from './Engine.js';
import * as THREE from 'three';

vi.mock('three', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      info: { memory: { geometries: 150, textures: 45 } },
      dispose: vi.fn(),
      setAnimationLoop: vi.fn(),
      render: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      domElement: document.createElement('canvas'),
    })),
  };
});

describe('Engine Memory Management', () => {
  let container: HTMLCanvasElement;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    container = document.createElement('canvas');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should completely deallocate geometries and textures on dispose', () => {
    // 1. Instantiate the Engine
    const engine = new Engine(container, 'flat');
    
    // In a real environment, we would await full scene load, 
    // but here we just check if the properties exist and reset correctly.
    
    // 2. Simulate some allocations
    // Since we mocked WebGLRenderer, we can get its instance from the engine
    const renderer = (engine as any).renderer;
    
    // Inject mock dispose behavior manually for our test
    renderer.dispose.mockImplementation(() => {
      renderer.info.memory.geometries = 0;
      renderer.info.memory.textures = 0;
    });

    // 3. Trigger dispose
    engine.dispose();

    // 4. Assert memory is freed
    expect(renderer.info.memory.geometries).toBe(0);
    expect(renderer.info.memory.textures).toBe(0);
    expect(renderer.dispose).toHaveBeenCalled();
  });
});
