# Pending Gesture Changes

- Integrate sandbox hold/tap feedback into production scenes (SoftCanvasScene/GestureDisplay) or migrate to a shared gesture pipeline.
- Refactor GestureDisplay DOM updates to use cached nodes + throttled refresh to avoid full innerHTML rebuilds each frame.
- Evaluate remaining legacy gesture logic in SoftCanvasScene and align thresholds with sandbox (tap threshold 0.045, hold 1.5s).
- Add automated tests/self-checks to ensure hold-threshold events fire once per contact and are cleared when hands leave the frame.
