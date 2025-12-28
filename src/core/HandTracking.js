import {
  FilesetResolver,
  HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm";
import { uiManager } from '../ui/UIManager.js';


export class HandTracking {
  constructor() {
    this.video = null;
    this.handLandmarker = null;
    this.lastVideoTime = -1;
    this.results = undefined;
    this.running = false;
    this.isLoaded = false;
  }

  async initialize() {
    console.log("Initializing Hand Tracking...");
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });

      await this.setupWebcam();
      this.isLoaded = true;
      console.log("Hand Tracking Initialized");
      this.startPredictionLoop();
    } catch (error) {
      console.error("Failed to initialize hand tracking:", error);
    }
  }

  async setupWebcam() {
    this.video = document.createElement("video");
    this.video.className = 'video-feed';
    // Styles moved to CSS .video-feed class
    this.video.autoplay = true;
    this.video.playsInline = true;

    // Register with UIManager
    uiManager.register('video-feed', this.video, { type: 'video', description: 'Main webcam feed' });


    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.video);
    } else {
      document.body.appendChild(this.video);
    }

    const constraints = {
      video: {
        width: 1280,
        height: 720
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          resolve();
        };
      });
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  }

  startPredictionLoop() {
    this.running = true;
    const predict = () => {
      if (this.video && this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;
        this.results = this.handLandmarker.detectForVideo(this.video, performance.now());
      }
      if (this.running) {
        requestAnimationFrame(predict);
      }
    };
    predict();
  }

  getLandmarks() {
    return this.results ? this.results.landmarks : [];
  }

  getHandedness() {
    return this.results ? this.results.handedness : [];
  }

  getVideoElement() {
    return this.video;
  }
}

export const handTrackingInstance = new HandTracking();
