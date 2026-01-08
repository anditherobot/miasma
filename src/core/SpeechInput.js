// Simple Web Speech API wrapper for interim and final transcription
// Gracefully handles unsupported browsers.

class SpeechInputManager {
    constructor() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.SpeechRecognition = SR || null;
        this.recognition = null;
        this.active = false;
        this.lang = 'en-US';
    }

    isSupported() {
        return !!this.SpeechRecognition;
    }

    startListening({ onInterim, onFinal, onError } = {}) {
        if (!this.isSupported()) {
            console.warn('Speech recognition not supported in this browser.');
            return null;
        }
        if (this.active) {
            // Restart to ensure fresh session
            this.stopListening();
        }
        const rec = new this.SpeechRecognition();
        rec.continuous = true; // allow longer dictation
        rec.interimResults = true; // stream interim words
        rec.lang = this.lang;

        rec.onresult = (event) => {
            let interim = '';
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += transcript;
                } else {
                    interim += transcript;
                }
            }
            if (interim && typeof onInterim === 'function') onInterim(interim);
            if (finalText && typeof onFinal === 'function') onFinal(finalText);
        };

        rec.onerror = (e) => {
            this.active = false;
            if (typeof onError === 'function') onError(e);
        };

        rec.onend = () => {
            this.active = false;
        };

        try {
            rec.start();
            this.recognition = rec;
            this.active = true;
        } catch (e) {
            console.error('Failed to start speech recognition', e);
            this.active = false;
            return null;
        }
        return rec;
    }

    stopListening() {
        if (this.recognition) {
            try { this.recognition.stop(); } catch {}
        }
        this.recognition = null;
        this.active = false;
    }

    setLanguage(lang) {
        this.lang = lang || this.lang;
    }
}

export const speechInput = new SpeechInputManager();
