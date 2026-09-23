import { Scene, WebGLRenderer, Color, FogExp2, NoToneMapping, SRGBColorSpace } from 'three';
import { EffectComposer, EffectPass, RenderPass, BloomEffect, VignetteEffect, NoiseEffect, Effect } from 'postprocessing';
import { bus, EngineCommand, QualityTier, WorldData } from './bus.js';
import { ResourceTracker } from './ResourceTracker.js';
import { Loop } from './Loop.js';
import { Governor } from './systems/Governor.js';
import { LightField } from './systems/LightField.js';
import { FieldStars } from './systems/FieldStars.js';
import { Constellations } from './systems/Constellations.js';
import { RailCamera } from './systems/RailCamera.js';
import { Picking } from './systems/Picking.js';
import { Exposure } from './systems/Exposure.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { layoutLights } from '@slow-light/shared';
// Assuming night theme void color from spec tokens
const VOID_COLOR = '#050814'; 

export class Engine {
  private canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private composer: EffectComposer | null = null;
  private scene: Scene;
  private tracker = new ResourceTracker();
  private loop: Loop;
  
  // Systems
  private governor: Governor;
  private cameraSystem: RailCamera;
  private lightField: LightField;
  private stars: FieldStars;
  private constellations: Constellations;
  private picking: Picking;
  private exposure: Exposure;
  private audioSystem: AudioSystem;
  
  private currentTier: QualityTier;
  private reducedMotion = false;
  private time = 0;

  private unsubBus: () => void;

  constructor(canvas: HTMLCanvasElement, initialTier: QualityTier) {
    this.canvas = canvas;
    this.currentTier = initialTier;

    // WebGLRenderer setup
    this.renderer = new WebGLRenderer({
      canvas,
      powerPreference: 'high-performance',
      antialias: false, // We use postprocessing MSAA where supported
      stencil: false,
      depth: true,
      alpha: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;

    // Scene setup
    this.scene = new Scene();
    this.scene.background = new Color(VOID_COLOR);
    this.scene.fog = new FogExp2(VOID_COLOR, 0.015); // Adjust density per tier if needed

    // Systems
    this.governor = new Governor(initialTier);
    this.cameraSystem = new RailCamera(canvas.clientWidth / canvas.clientHeight);
    this.lightField = new LightField(this.tracker, 10000); // 10k lights max
    this.stars = new FieldStars(this.tracker, this.getStarCount(initialTier), this.getDpr(initialTier));
    this.constellations = new Constellations(this.tracker, '#232C42'); // scene.border roughly
    this.picking = new Picking(this.cameraSystem.camera);
    this.exposure = new Exposure();
    this.audioSystem = new AudioSystem();

    this.scene.add(this.lightField.mesh);
    this.scene.add(this.stars.mesh);
    this.scene.add(this.constellations.mesh);
    this.scene.add(this.cameraSystem.camera);

    this.setupPostProcessing();
    this.resize(canvas.clientWidth, canvas.clientHeight);

    // Loop
    this.loop = new Loop(this.renderer, this.governor, this.update);

    // Event bindings
    this.unsubBus = bus.onCommand(this.handleCommand);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
    
    // Input bindings for picking & exposure
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);

    // Start
    this.loop.start();
    bus.emitEvent({ type: 'ready' });
  }

  private handleCommand = (cmd: EngineCommand) => {
    switch (cmd.type) {
      case 'setWorld':
        this.buildWorld(cmd.data);
        break;
      case 'setTier':
        this.currentTier = cmd.tier;
        this.applyTier();
        break;
      case 'setReducedMotion':
        this.reducedMotion = cmd.enabled;
        break;
      case 'audioToggle':
        if (cmd.enabled) this.audioSystem.enable();
        else this.audioSystem.disable();
        break;
      case 'dispose':
        this.dispose();
        break;
      // Stubs for remaining commands
    }
  };

  private getStarCount(tier: QualityTier) {
    if (tier === 'ultra') return 4000;
    if (tier === 'high') return 2500;
    if (tier === 'medium') return 1200;
    return 500; // low/reduced
  }

  private getDpr(tier: QualityTier) {
    if (tier === 'ultra') return 2.0;
    if (tier === 'high') return 1.75;
    if (tier === 'medium') return 1.5;
    return 1.0;
  }

  private applyTier() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.getDpr(this.currentTier)));
    this.setupPostProcessing();
  }

  private buildWorld(data: WorldData) {
    const placements = layoutLights(data.lights, data.chapterCount, data.worldSeed);
    
    // Convert array of ids to index map for fast updates
    const inputMap = new Map<string, number>();
    for (const l of data.lights) {
      inputMap.set(l.id, l.significance);
    }
    
    this.lightField.updateData(placements, inputMap);
    this.picking.updateData(placements);
    
    const frontierZ = placements.length > 0 ? placements[placements.length - 1]!.z : 0;
    this.cameraSystem.setFrontier(frontierZ);
  }

  private setupPostProcessing() {
    if (this.composer) {
      this.composer.dispose();
    }
    
    if (this.currentTier === 'low' || this.currentTier === 'flat') {
      this.composer = null;
      return;
    }

    this.composer = new EffectComposer(this.renderer, {
      multisampling: this.currentTier === 'ultra' ? 4 : (this.currentTier === 'high' ? 2 : 0)
    });

    const renderPass = new RenderPass(this.scene, this.cameraSystem.camera);
    this.composer.addPass(renderPass);

    const bloom = new BloomEffect({
      luminanceThreshold: 0.35,
      intensity: 0.6,
      mipmapBlur: true
    });
    
    const vignette = new VignetteEffect({
      offset: 0.3,
      darkness: 0.5
    });

    const effects: Effect[] = [bloom, vignette];

    if (this.currentTier === 'ultra' || this.currentTier === 'high') {
      const noise = new NoiseEffect({
        premultiply: true,
      });
      effects.push(noise);
    }

    const effectPass = new EffectPass(this.cameraSystem.camera, ...effects);
    this.composer.addPass(effectPass);
  }

  private resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    this.cameraSystem.updateFOV(w / h);
  }

  private update = (dt: number) => {
    // Resize check
    if (this.canvas.width !== this.canvas.clientWidth || this.canvas.height !== this.canvas.clientHeight) {
      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    this.time += dt;

    this.cameraSystem.updateFrame(dt);
    this.exposure.updateFrame(dt);
    this.lightField.updateFrame(this.time, this.exposure.value, this.reducedMotion);

    if (this.composer) {
      this.composer.render(dt);
    } else {
      this.renderer.render(this.scene, this.cameraSystem.camera);
    }
  };

  private registerInput = () => {
    this.exposure.registerInput();
    this.loop.registerInput();
  };

  private onPointerMove = (e: PointerEvent) => {
    this.registerInput();
    const rect = this.canvas.getBoundingClientRect();
    this.picking.onPointerMove(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
  };

  private onClick = (e: MouseEvent) => {
    this.registerInput();
    const rect = this.canvas.getBoundingClientRect();
    this.picking.onClick(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
  };

  private onWheel = (e: WheelEvent) => {
    this.registerInput();
    // Prevent default scrolling on canvas
    e.preventDefault();
    this.cameraSystem.moveTargetZ(-e.deltaY * 0.012);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.registerInput();
    if (e.key === 'ArrowUp') this.cameraSystem.moveTargetZ(e.shiftKey ? 8 : 2);
    if (e.key === 'ArrowDown') this.cameraSystem.moveTargetZ(e.shiftKey ? -8 : -2);
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.loop.stop();
    bus.emitEvent({ type: 'contextLost' });
  };

  private onContextRestored = () => {
    // Rebuild everything.
    bus.emitEvent({ type: 'contextRestored' });
  };

  dispose() {
    this.audioSystem.dispose();
    this.loop.dispose();
    this.unsubBus();
    this.tracker.dispose();
    if (this.composer) this.composer.dispose();
    this.renderer.dispose();
    
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
