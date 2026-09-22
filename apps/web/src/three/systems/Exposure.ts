/**
 * Exposure System (R5)
 * Controls the overall exposure level, dropping in stillness.
 */
export class Exposure {
  public value = 1.0;
  
  private timeSinceInput = 0;

  // Called when any user input happens (mouse move, wheel, key)
  registerInput() {
    this.timeSinceInput = 0;
  }

  updateFrame(dt: number) {
    this.timeSinceInput += dt;

    if (this.timeSinceInput > 6.0) {
      // Ease toward 1.0 (bright, stars visible) over 8s
      // dt is seconds, so ease speed is e.g. (1 - exposure) * dt / 8
      this.value += (1.0 - this.value) * (dt / 8.0);
    } else {
      // Input active: ease toward 0.75 (darker, focused on path) over 1.5s
      this.value += (0.75 - this.value) * (dt / 1.5);
    }
  }
}
