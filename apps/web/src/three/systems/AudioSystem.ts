export class AudioSystem {
  private ambientAudio: HTMLAudioElement | null = null;
  private isEnabled: boolean = false;
  private fadeInterval: number | null = null;

  constructor() {
    this.ambientAudio = new Audio();
    // Using a synthetic placeholder or silence track if no asset provided
    this.ambientAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA=='; // 1 sample of silence
    this.ambientAudio.loop = true;
    this.ambientAudio.volume = 0;
  }

  public enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.ambientAudio?.play().catch(() => {
      // Autoplay blocked — the user gesture handler will retry on first interaction
    });
    this.fadeTo(0.5, 2000);
  }

  public disable() {
    this.isEnabled = false;
    this.fadeTo(0, 1000).then(() => {
      this.ambientAudio?.pause();
    });
  }

  public setTrack(url: string) {
    if (this.ambientAudio) {
      const wasPlaying = !this.ambientAudio.paused;
      this.ambientAudio.src = url;
      if (wasPlaying && this.isEnabled) {
        this.ambientAudio.play().catch(() => {});
      }
    }
  }

  private fadeTo(targetVolume: number, durationMs: number): Promise<void> {
    return new Promise(resolve => {
      if (!this.ambientAudio) return resolve();

      if (this.fadeInterval) {
        window.clearInterval(this.fadeInterval);
      }

      const startVolume = this.ambientAudio.volume;
      const startTime = performance.now();

      this.fadeInterval = window.setInterval(() => {
        const now = performance.now();
        const progress = Math.min((now - startTime) / durationMs, 1);
        
        if (this.ambientAudio) {
          this.ambientAudio.volume = startVolume + (targetVolume - startVolume) * progress;
        }

        if (progress >= 1) {
          if (this.fadeInterval) window.clearInterval(this.fadeInterval);
          resolve();
        }
      }, 50);
    });
  }

  public dispose() {
    if (this.fadeInterval) window.clearInterval(this.fadeInterval);
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.src = '';
      this.ambientAudio = null;
    }
  }
}
