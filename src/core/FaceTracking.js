/**
 * FaceTracking - MediaPipe Face Mesh Integration
 * Provides face landmark detection for shader effects
 */

import {
  FilesetResolver,
  FaceLandmarker,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm";
import { uiManager } from '../ui/UIManager.js';

export class FaceTracking {
  constructor() {
    this.video = null;
    this.faceLandmarker = null;
    this.lastVideoTime = -1;
    this.results = undefined;
    this.running = false;
    this.isLoaded = false;
  }

  async initialize() {
    console.log("Initializing Face Tracking...");
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true
      });

      await this.setupWebcam();
      this.isLoaded = true;
      console.log("Face Tracking Initialized");
      this.startPredictionLoop();
    } catch (error) {
      console.error("Failed to initialize face tracking:", error);
    }
  }

  async setupWebcam() {
    this.video = document.createElement("video");
    this.video.className = 'face-video-feed';
    this.video.autoplay = true;
    this.video.playsInline = true;

    // Register with UIManager
    uiManager.register('face-video-feed', this.video, {
      type: 'video',
      description: 'Face tracking webcam feed'
    });

    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.video);
    } else {
      document.body.appendChild(this.video);
    }

    const constraints = {
      video: {
        width: 1280,
        height: 720,
        facingMode: "user" // Front camera for face
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
        this.results = this.faceLandmarker.detectForVideo(this.video, performance.now());
      }
      if (this.running) {
        requestAnimationFrame(predict);
      }
    };
    predict();
  }

  /**
   * Get face landmarks
   * Returns array of face landmark sets (468 points per face)
   */
  getLandmarks() {
    return this.results && this.results.faceLandmarks ? this.results.faceLandmarks : [];
  }

  /**
   * Get face blendshapes (expressions)
   */
  getBlendshapes() {
    return this.results && this.results.faceBlendshapes ? this.results.faceBlendshapes : [];
  }

  /**
   * Get facial transformation matrices
   */
  getTransformationMatrices() {
    return this.results && this.results.facialTransformationMatrixes
      ? this.results.facialTransformationMatrixes
      : [];
  }

  /**
   * Get the video element
   */
  getVideoElement() {
    return this.video;
  }

  /**
   * Get bounding box for first detected face
   * Returns {x, y, width, height} in normalized coordinates [0-1]
   */
  getFaceBoundingBox() {
    const landmarks = this.getLandmarks();
    if (landmarks.length === 0) return null;

    const faceLandmarks = landmarks[0];
    if (!faceLandmarks || faceLandmarks.length === 0) return null;

    let minX = 1, minY = 1, maxX = 0, maxY = 0;

    faceLandmarks.forEach(landmark => {
      minX = Math.min(minX, landmark.x);
      minY = Math.min(minY, landmark.y);
      maxX = Math.max(maxX, landmark.x);
      maxY = Math.max(maxY, landmark.y);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  /**
   * Stop tracking
   */
  stop() {
    this.running = false;
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
    }
  }
}

export const faceTrackingInstance = new FaceTracking();
