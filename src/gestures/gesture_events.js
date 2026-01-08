// GestureEventBus converts classifier outputs into DOM CustomEvents.
export class GestureEventBus {
  constructor(target = window) {
    this.target = target;
  }

  emit(name, detail) {
    this.target.dispatchEvent(new CustomEvent(name, { detail }));
  }

  on(name, handler) {
    this.target.addEventListener(name, handler);
    return () => this.target.removeEventListener(name, handler);
  }
}

// Simple test
export function selfTestGestureEvents() {
  const bus = new GestureEventBus();
  return new Promise((resolve) => {
    const off = bus.on('gesture-test', (ev) => {
      off();
      resolve(ev.detail === 42);
    });
    bus.emit('gesture-test', 42);
  });
}
