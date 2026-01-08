import { distance2D } from './spatial_math.js';

const DEFAULTS = {
  palmOpenYOffset: 0.1,
  pinchThreshold: 0.05,
  fistThreshold: 0.04
};

export function isPalmOpen(hand, opts = {}) {
  if (!hand || hand.length < 21) return false;
  const palmOffset = opts.palmOpenYOffset ?? DEFAULTS.palmOpenYOffset;
  const wrist = hand[0];
  const tips = [hand[8], hand[12], hand[16], hand[20]];
  return tips.every((f) => f.y < wrist.y - palmOffset);
}

export function isPinch(hand, opts = {}) {
  if (!hand || hand.length < 9) return false;
  const threshold = opts.pinchThreshold ?? DEFAULTS.pinchThreshold;
  const thumb = hand[4];
  const index = hand[8];
  return distance2D(thumb, index) < threshold;
}

export function isFist(hand, opts = {}) {
  if (!hand || hand.length < 21) return false;
  const threshold = opts.fistThreshold ?? DEFAULTS.fistThreshold;
  const wrist = hand[0];
  const tips = [hand[8], hand[12], hand[16], hand[20]];
  return tips.every((f) => distance2D(f, wrist) < threshold);
}

// Thumb tap detection against a fingertip index (8=index, 12=middle, 16=ring, 20=pinky)
export function isThumbTap(hand, fingerTipIndex, opts = {}) {
  if (!hand || hand.length <= fingerTipIndex || hand.length < 5) return false;
  const threshold = opts.tapThreshold ?? 0.03;
  const thumb = hand[4];
  const finger = hand[fingerTipIndex];
  return distance2D(thumb, finger) < threshold;
}

// Simple test cases
export function selfTestPoseLibrary() {
  const wrist = { x: 0.5, y: 0.5 };
  const openTips = [
    { x: 0.5, y: 0.3 },
    { x: 0.5, y: 0.3 },
    { x: 0.5, y: 0.3 },
    { x: 0.5, y: 0.3 }
  ];
  const handOpen = [wrist, {}, {}, {}, { x: 0, y: 0 }, {}, {}, {}, ...openTips];
  const closedTips = [
    { x: 0.5, y: 0.55 },
    { x: 0.5, y: 0.56 },
    { x: 0.5, y: 0.57 },
    { x: 0.5, y: 0.58 }
  ];
  const handFist = [wrist, {}, {}, {}, { x: 0, y: 0 }, {}, {}, {}, ...closedTips];
  const handPinch = [wrist, {}, {}, {}, { x: 0.5, y: 0.5 }, {}, {}, {}, { x: 0.52, y: 0.5 }];
  return (
    isPalmOpen(handOpen) &&
    !isPalmOpen(handFist) &&
    isFist(handFist) &&
    !isFist(handOpen) &&
    isThumbTap(handPinch, 8, { tapThreshold: 0.04 })
  );
}
