# AR Guitar Trainer - Development Log

## Project Overview
An augmented reality guitar training application using hand tracking and audio analysis to provide real-time visual feedback for guitar practice.

## Technology Stack
- **Game Engine**: Phaser 3 (WebGL)
- **Hand Tracking**: MediaPipe Hand Landmarker
- **Audio Analysis**: Web Audio API with autocorrelation pitch detection
- **Build Tool**: Vite
- **Language**: JavaScript (ES6+)

---

## Development Timeline

### Session 1: Initial Setup & Core Features

#### 1. Project Initialization
- Set up Phaser 3 with Vite
- Created basic scene structure
- Integrated MediaPipe hand tracking

#### 2. Hand Tracking System (`src/core/HandTracking.js`)
- Implemented webcam capture with MediaPipe
- Hand landmark detection (21 points per hand)
- Configured for 2 hands detection
- **Key Decision**: Used GPU delegate for better performance
- **Webcam Settings**:
  - Resolution: 1280x720
  - Display: 90vw × 90vh (responsive)
  - Opacity: 0.75 for better overlay visibility
  - Added white glow effect for better scene lighting:
    - 4-layer box-shadow (60px, 120px, 180px, 240px blur)
    - Creates softbox lighting effect

#### 3. Audio Analysis System (`src/core/AudioManager.js`)
- Implemented Web Audio API microphone capture
- **Pitch Detection**: Autocorrelation algorithm (ACF2+)
  - Sample rate: 2048 samples
  - RMS threshold: 0.005 (lowered for better sensitivity)
  - Frequency range: 50 Hz - ~1000 Hz
- **Waveform Visualization**: Real-time time-domain data extraction
- **Issue Encountered**: Browser autoplay policies
  - **Solution**: Trigger audio on first user interaction (click/keypress)

#### 4. Calibration System (`src/scenes/GuitarScene.js`)
- **Concept**: "Lock & Layer" approach
  - User places 4 fingers (index, middle, ring, pinky) on frets 1-4
  - System detects horizontal alignment
  - Locks guitar neck position for stable AR overlay

- **Calibration Logic**:
  - Tracks fingertips: landmarks [8, 12, 16, 20]
  - Validates alignment: Y-variance < 30px
  - Checks finger spacing consistency (±40% of average)
  - Requires 60 frames (~1 second) of stable hold
  - Calculates neck angle and fret spacing

- **Visual Feedback**:
  - **Aligned**: Green glowing line (4 layers: 20px → 12px → 6px → 3px)
  - **Not Aligned**: Orange/red line with dimmer circles
  - Progress arc indicator (0-100%)
  - Pulsing circles on fingertips

- **Hand Filtering**: LEFT HAND ONLY
  - Added handedness detection
  - Filters out right hand to avoid confusion
  - **Reason**: Guitar fretting hand (left for right-handed players)

#### 5. String Visualization System
- **6 Guitar Strings** (standard tuning):
  ```
  String 1 (highest): E4 = 329.63 Hz
  String 2: B3 = 246.94 Hz
  String 3: G3 = 196.00 Hz
  String 4: D3 = 146.83 Hz
  String 5: A2 = 110.00 Hz
  String 6 (lowest): E2 = 82.41 Hz
  ```

- **String Detection**:
  - Maps detected frequency to closest string
  - Checks fundamental + 3 harmonics
  - ±50 Hz tolerance for matching

- **Visual Design**:
  - Strings spaced 20px apart perpendicular to neck
  - Extend 500px along neck direction
  - **Active string**: Pulsing glow in note color (3 layers)
  - **Inactive strings**: Subtle cyan (low opacity)

#### 6. Dynamic Fretboard Tracking
- Fretboard follows hand movement in real-time
- Smoothing factor: 0.3 (reduces jitter)
- Updates center position and angle based on 4 finger positions
- Maintains stable reference even during slight hand movements

#### 7. AR Hand Visualization
- **Bone Structure**:
  - All 21 landmarks connected
  - Opacity gradient: 40% (palm) → 70% (fingertips)
  - Color: Cyan (#aaffff)

- **Joint Markers**:
  - Fingertips: Rotating tech gears (segmented arcs)
  - Regular joints: Small white glowing dots
  - Palm center: Large rotating gear with pulsing ring

- **Tech Gear Design**:
  - 4 segmented arcs with gaps
  - Inner detail circle
  - Crosshair center
  - Rotation animation for sci-fi effect

#### 8. Audio-Reactive Visualizations

**A. Note Display (Top Center)**
- Large 72px text showing detected note (C, C#, D, etc.)
- Color-coded by note (chromatic circle):
  ```
  C: Red, C#: Orange-Red, D: Orange, D#: Yellow-Orange,
  E: Yellow, F: Yellow-Green, F#: Green, G: Cyan-Green,
  G#: Cyan, A: Blue, A#: Purple-Blue, B: Purple
  ```
- Pulsing glow effect synchronized with audio
- Shows "--" when no pitch detected

**B. Visual Tuner (Below Note)**
- Horizontal bar showing pitch accuracy in cents
- Range: ±50 cents
- Green indicator: In tune (±5 cents)
- Orange indicator: Out of tune
- Displays exact cent offset (+/-XX¢)
- Tick marks at 25-cent intervals

**C. Waveform Display (Bottom)**
- Real-time time-domain audio visualization
- 900px × 80px area
- Color matches detected note
- Performance optimization: Samples every nth point
- No background (transparent overlay)
- 2-layer rendering: Glow + sharp line

#### 9. UI/UX Design - Sci-Fi Theme

**Color Palette**:
- Background: Pure black (#0a0a0a)
- Primary accent: Cyan (#00ffff)
- Active state: Green (#00ff88)
- Warning state: Orange (#ffaa00)
- Error state: Orange-red (#ff5500)

**Typography**:
- HUD text: Courier New (monospace)
- Note display: Arial Black (high impact)
- All text has glowing shadows matching color

**Layout**:
- Top Left: Status HUD (frequency, note, mode)
- Top Center: Large note display
- Top Right: System status pill (● ACTIVE / ○ STANDBY)
- Center Bottom: Instructions
- Bottom: Waveform visualization
- Center: Tuner (when active)

**Glow Effects**:
- Multi-layer shadows for depth
- Pulsing animations synchronized with time
- Color-coded feedback (green = good, orange = adjust)

---

## Key Technical Decisions

### 1. Why Autocorrelation for Pitch Detection?
- **Pros**:
  - Works well with harmonic instruments (guitar)
  - More accurate than FFT for musical pitch
  - Handles polyphonic overtones better
- **Cons**:
  - More CPU intensive
  - Can struggle with very quiet signals
- **Alternative Considered**: FFT-based detection (rejected due to less accuracy for guitar)

### 2. Why Left Hand Only?
- Guitar fretting hand provides stable reference point
- Right hand (strumming) moves too much for stable tracking
- Reduces confusion from detecting multiple hands
- Cleaner UX with single hand focus

### 3. Why 6 Strings Instead of Fret Lines?
- Matches actual guitar visualization
- Easier to see which string is active
- More intuitive for guitar players
- Reduces visual clutter

### 4. Why "Lock & Layer" Calibration?
- **Problem**: Constant hand tracking = jittery overlay
- **Solution**: Calibrate once, then track relative to that position
- Provides stable AR reference frame
- User can recalibrate (SPACE key) when needed

---

## Known Issues & Solutions

### Issue 1: Browser Autoplay Restrictions
**Problem**: Web Audio API blocked until user interaction
**Solution**:
- Try to start immediately
- Fall back to first click/keypress trigger
- Clear user feedback (console logs)

### Issue 2: Audio Detection Sensitivity
**Problem**: Initial RMS threshold (0.01) too strict
**Solution**: Lowered to 0.005 for better sensitivity
**Future**: Add user-adjustable gain control

### Issue 3: Hand Skeleton Misalignment
**Problem**: Coordinate scaling didn't match webcam
**Solution**:
- Unified scaling (1000 × 800)
- Copied working bone structure from HandGestures scene
- Used exact MediaPipe landmark indices

### Issue 4: Waveform Not Showing
**Problem**: No visual feedback, even with audio working
**Status**: Added debug logging, improved visibility settings
**Solution**: Ensured waveform always draws, added color fallback

---

## Performance Optimizations

1. **Waveform Sampling**: Draw every nth point instead of all 2048 samples
2. **Hand Tracking**: GPU acceleration via MediaPipe
3. **Smoothing**: 30% interpolation prevents jittery movement while maintaining responsiveness
4. **Graphics Clearing**: Clear all graphics layers each frame to prevent memory buildup

---

## File Structure

```
miasmajs/
├── src/
│   ├── core/
│   │   ├── AudioManager.js      # Microphone capture & pitch detection
│   │   └── HandTracking.js      # MediaPipe hand tracking wrapper
│   ├── scenes/
│   │   ├── GuitarScene.js       # Main AR guitar trainer scene
│   │   ├── HandGestures.js      # Demo hand visualization scene
│   │   └── Level1.js            # (Legacy scene)
│   └── main.js                  # Phaser game initialization
├── style.css                    # Dark theme styling
├── index.html                   # Entry point
└── DEVELOPMENT_LOG.md          # This file
```

---

## Next Steps / Roadmap

### Immediate Fixes
- [ ] Verify audio detection is working with real guitar input
- [ ] Test RMS levels with different microphone gains
- [ ] Ensure all UI elements are visible and positioned correctly

### Short-term Features
- [ ] Chord detection (multiple notes simultaneously)
- [ ] Fret position markers (show which fret to press)
- [ ] Recording/playback of practice sessions
- [ ] Metronome integration

### Medium-term Features
- [ ] Guitar tabs overlay (scrolling tablature)
- [ ] Practice mode with note sequences
- [ ] Accuracy scoring system
- [ ] Multiple tuning support (drop D, etc.)

### Long-term Vision
- [ ] Machine learning for advanced chord recognition
- [ ] Multi-user jam session mode
- [ ] Song library with difficulty ratings
- [ ] Progress tracking dashboard

---

## Testing Notes

### Test Environment
- Browser: Chrome (recommended for Web Audio API support)
- Webcam: Any 720p+ camera
- Microphone: Built-in or external (positioned near guitar)
- Lighting: Good lighting recommended for hand tracking

### Test Checklist
- [ ] Microphone permission granted
- [ ] Webcam permission granted
- [ ] Hand tracking detects left hand
- [ ] Calibration completes successfully
- [ ] Strings visible and tracking hand movement
- [ ] Audio waveform displays at bottom
- [ ] Note detection works when playing guitar
- [ ] Active string highlights correctly

---

## Changelog

### 2025-12-28 (Session 2)
- **Fixed**: Audio visualizations now visible during calibration mode
  - Waveform displays even before hand calibration
  - Note display and HUD show frequency/note in both modes
  - **Issue**: User couldn't see if audio was working during calibration
  - **Solution**: Show audio feedback in both CALIBRATING and TRACKING modes

### 2025-12-28 (Session 1)
- **Added**: Left-hand-only detection with handedness filtering
- **Added**: 6-string visualization with frequency-to-string mapping
- **Added**: Dynamic fretboard tracking that follows hand movement
- **Added**: Audio-reactive string highlighting
- **Changed**: Replaced fret lines with guitar string representation
- **Fixed**: Lowered audio sensitivity threshold (0.01 → 0.005)
- **Fixed**: Added debug logging for audio troubleshooting
- **Improved**: Webcam glow effect (4 layers, up to 240px spread)
- **Improved**: Calibration visual feedback (color-coded alignment)

### Earlier (Initial Build)
- Created project structure with Phaser 3 + Vite
- Implemented MediaPipe hand tracking
- Built audio analysis system with autocorrelation
- Designed sci-fi UI theme with glow effects
- Created calibration system for stable AR overlay
- Added real-time waveform visualization
- Implemented visual tuner display

---

*This document will be updated with each development session to maintain a complete record of the project's evolution.*
