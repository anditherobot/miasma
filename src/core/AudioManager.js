export default class AudioManager {
    static init() {
        if (this.ctx) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);

        // Sub-channels
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.8;
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 1.0;
        this.sfxGain.connect(this.masterGain);

        this.buffers = {};
        this.initialized = true;

        // Pitch Detection Variables
        this.analyser = null;
        this.mediaStreamSource = null;
        this.detectorBuffer = new Float32Array(2048);
    }

    static async startMicrophone() {
        if (!this.initialized) this.init();
        this.resume();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaStreamSource = this.ctx.createMediaStreamSource(stream);
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 2048;
            this.mediaStreamSource.connect(this.analyser);
            console.log("Microphone connected for pitch detection.");
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    }

    static getPitch() {
        if (!this.analyser) return -1;

        this.analyser.getFloatTimeDomainData(this.detectorBuffer);
        const ac = this.autoCorrelate(this.detectorBuffer, this.ctx.sampleRate);
        return ac; // Returns frequency in Hz, or -1 if undefined
    }

    static getWaveform() {
        if (!this.analyser) return [];

        const waveformBuffer = new Float32Array(this.analyser.fftSize);
        this.analyser.getFloatTimeDomainData(waveformBuffer);

        // Return normalized waveform data (array of values between -1 and 1)
        return Array.from(waveformBuffer);
    }

    // Basic Autocorrelation Algorithm
    static autoCorrelate(buf, sampleRate) {
        // Implements the ACF2+ algorithm
        let SIZE = buf.length;
        let rms = 0;

        for (let i = 0; i < SIZE; i++) {
            const val = buf[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);

        if (rms < 0.01) // Not enough signal
            return -1;

        let r1 = 0, r2 = SIZE - 1, thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++)
            if (Math.abs(buf[i]) < thres) { r1 = i; break; }
        for (let i = 1; i < SIZE / 2; i++)
            if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

        buf = buf.slice(r1, r2);
        SIZE = buf.length;

        const c = new Array(SIZE).fill(0);
        for (let i = 0; i < SIZE; i++)
            for (let j = 0; j < SIZE - i; j++)
                c[i] = c[i] + buf[j] * buf[j + i];

        let d = 0; while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < SIZE; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;

        const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
    }

    static resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    static playSound(key) {
        if (!this.initialized) this.init();
        this.resume(); // Ensure context is running

        switch (key) {
            case 'sizzle':
                this.playSizzle();
                break;
            case 'splash':
                this.playSplash();
                break;
            default:
                console.warn(`Sound '${key}' not found or implemented.`);
        }
    }

    // --- SYNTHESIZED SOUNDS ---

    static playSizzle() {
        // White noise burst
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Filter to make it sound more like a "burn" than static
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        // Envelope
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start();
    }

    static playSplash() {
        // Watery droplet sound (Sine sweep)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
}