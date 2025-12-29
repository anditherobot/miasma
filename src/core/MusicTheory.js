export const MusicTheory = {
    noteToHz(note) {
        const noteMap = {
            'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
            'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
            'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
        };
        return noteMap[note] || 440;
    },

    hzToNote(frequency) {
        const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        if (frequency < 20) return '-';
        const pitchVal = 12 * (Math.log(frequency / 440) / Math.log(2));
        const noteIndex = Math.round(pitchVal) + 69;
        const noteVal = noteIndex % 12;
        if (noteVal < 0 || noteVal >= noteStrings.length) return '-';
        return noteStrings[noteVal];
    },

    getNoteColor(note) {
        const colorMap = {
            'C': 0xff0000, 'C#': 0xff4400, 'D': 0xff8800, 'D#': 0xffcc00,
            'E': 0xffff00, 'F': 0x88ff00, 'F#': 0x00ff00, 'G': 0x00ff88,
            'G#': 0x00ffff, 'A': 0x0088ff, 'A#': 0x4400ff, 'B': 0x8800ff
        };
        return colorMap[note] || 0xffffff;
    },

    getStringFrequencies() {
        return [
            { string: 5, freq: 82.41, name: 'E2' },   // 6th string (lowest)
            { string: 4, freq: 110.00, name: 'A2' },  // 5th string
            { string: 3, freq: 146.83, name: 'D3' },  // 4th string
            { string: 2, freq: 196.00, name: 'G3' },  // 3rd string
            { string: 1, freq: 246.94, name: 'B3' },  // 2nd string
            { string: 0, freq: 329.63, name: 'E4' }   // 1st string (highest)
        ];
    },

    getActiveString(hz) {
        if (hz < 50) return -1;

        const stringFreqs = this.getStringFrequencies();
        let closestString = -1;
        let minDiff = Infinity;

        stringFreqs.forEach(s => {
            // Check fundamental and harmonics
            for (let harmonic = 1; harmonic <= 3; harmonic++) {
                const harmonicFreq = s.freq * harmonic;
                const diff = Math.abs(hz - harmonicFreq);

                // Allow ±50 Hz tolerance for string matching
                if (diff < minDiff && diff < 50) {
                    minDiff = diff;
                    closestString = s.string;
                }
            }
        });

        return closestString;
    }
};
