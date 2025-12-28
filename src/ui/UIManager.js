export class UIManager {
    constructor() {
        this.elements = new Map();
    }

    register(id, element, metadata = {}) {
        if (this.elements.has(id)) {
            console.warn(`Element with ID ${id} already registered. Overwriting.`);
        }
        this.elements.set(id, { element, metadata });
        console.log(`UI Element registered: ${id}`);
    }

    get(id) {
        return this.elements.get(id);
    }

    getAll() {
        return this.elements;
    }

    remove(id) {
        this.elements.delete(id);
    }
}

export const uiManager = new UIManager();

// Make it globally accessible for easy debugging
window.uiManager = uiManager;
