import {
  FilesetResolver,
  HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm";

// CameraFeed: acquires webcam frames and yields MediaPipe hand landmarks.
export class CameraFeed {
  constructor({ maxHands = 2, mirror = false } = {}) {
    this.maxHands = maxHands;
    this.mirror = mirror;
    this.video = null;
    this.handLandmarker = null;
    this.running = false;
    this.lastVideoTime = -1;
    this.listeners = [];
  }

  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: this.maxHands
    });

    await this.setupWebcam();
    this.start();
  }

  async setupWebcam() {
    this.video = document.createElement("video");
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    // Full-bleed video so overlay aligns pixel-for-pixel
    Object.assign(this.video.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      objectFit: "cover",
      transform: this.mirror ? "scaleX(-1)" : "none",
      opacity: "0.35",
      zIndex: "900",
      pointerEvents: "none"
    });
    document.body.appendChild(this.video);

    const constraints = { video: { width: 1280, height: 720 } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.video.srcObject = stream;
    await new Promise((resolve) => {
      this.video.onloadedmetadata = () => {
        this.video.play();
        resolve();
      };
    });
  }

  onResults(fn) {
    this.listeners.push(fn);
  }

  start() {
    if (!this.handLandmarker || !this.video) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      if (this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;
        const results = this.handLandmarker.detectForVideo(this.video, performance.now());
        if (results && results.landmarks) {
          this.listeners.forEach((fn) => fn(results.landmarks));
        }
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
  }
}
