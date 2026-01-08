/**
 * LayerPanel.js - Right-side UI panel for managing layer visibility
 * Shows all active layers with toggle controls
 */

export class LayerPanel {
    constructor(scene, palette) {
        this.scene = scene;
        this.palette = palette;
        this.isOpen = true;
        this.panelX = 1000 - 220; // Right side (1000 = typical game width)
        this.panelY = 20;
        this.panelWidth = 200;
        this.panelHeight = 800; // Increased for cards section
        
        // Layer definitions
        this.layers = [
            { id: 'bg', name: 'Background', depth: 0, active: false, type: 'graphics' },
            { id: 'trails', name: 'Motion Trails', depth: 2, active: true, type: 'graphics' },
            { id: 'cards', name: 'Cards', depth: 4, active: true, type: 'container' },
            { id: 'blocks', name: 'Blocks', depth: 5, active: true, type: 'container' },
            { id: 'hud', name: 'HUD Overlay', depth: 1000, active: true, type: 'ui' }
        ];
        
        this.layerObjects = {}; // Maps layer id to actual scene objects
        this.selectedLayer = null;
        this.selectedCard = null;
        this.cards = []; // Reference to scene cards
        this.cardItems = {}; // Card id -> UI elements
        
        this.create();
    }
    
    create() {
        // Panel background
        const panelBg = this.scene.add.rectangle(
            this.panelX + this.panelWidth / 2,
            this.panelY + this.panelHeight / 2,
            this.panelWidth,
            this.panelHeight,
            0x0a0a0a,
            0.9
        );
        panelBg.setStrokeStyle(2, this.palette.neon, 0.4);
        panelBg.setDepth(1001);
        this.panelBg = panelBg;
        
        // Panel title
        const title = this.scene.add.text(
            this.panelX + 10,
            this.panelY + 10,
            'LAYERS',
            {
                fontSize: '14px',
                color: this.palette.textPrimary,
                fontFamily: 'monospace',
                fontStyle: 'bold'
            }
        ).setDepth(1002);
        
        // Layer items
        let yOffset = this.panelY + 40;
        this.layerItems = {};
        
        this.layers.forEach((layer, index) => {
            const itemHeight = 50;
            const isSelected = this.selectedLayer === layer.id;
            
            // Item background
            const itemBg = this.scene.add.rectangle(
                this.panelX + this.panelWidth / 2,
                yOffset + itemHeight / 2,
                this.panelWidth - 4,
                itemHeight - 4,
                isSelected ? 0x1a3a3a : 0x0f1820,
                0.6
            );
            itemBg.setStrokeStyle(1, layer.active ? this.palette.neon : 0x444444, layer.active ? 0.6 : 0.3);
            itemBg.setDepth(1001);
            itemBg.setInteractive();
            
            // Hover effect
            itemBg.on('pointerover', () => {
                itemBg.setFillStyle(isSelected ? 0x1a3a3a : 0x1a2a30, 0.8);
            });
            itemBg.on('pointerout', () => {
                itemBg.setFillStyle(isSelected ? 0x1a3a3a : 0x0f1820, 0.6);
            });
            
            // Click to select/toggle
            itemBg.on('pointerdown', () => {
                this.selectLayer(layer.id);
            });
            
            // Layer name
            const nameText = this.scene.add.text(
                this.panelX + 18,
                yOffset + 12,
                layer.name,
                {
                    fontSize: '11px',
                    color: layer.active ? this.palette.textPrimary : '#666666',
                    fontFamily: 'monospace'
                }
            ).setDepth(1002);
            
            // Active indicator (checkbox-like)
            const checkboxSize = 14;
            const checkboxX = this.panelX + this.panelWidth - 25;
            const checkboxY = yOffset + 12;
            
            const checkbox = this.scene.add.rectangle(
                checkboxX,
                checkboxY,
                checkboxSize,
                checkboxSize,
                layer.active ? 0x00ff00 : 0x333333,
                0.5
            );
            checkbox.setStrokeStyle(1, layer.active ? this.palette.neon : 0x666666, 0.7);
            checkbox.setDepth(1002);
            checkbox.setInteractive();
            
            // Toggle on checkbox click
            checkbox.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation(); // Prevent layer selection
                this.toggleLayer(layer.id);
            });
            
            // Depth value
            const depthText = this.scene.add.text(
                this.panelX + 18,
                yOffset + 28,
                `Z: ${layer.depth}`,
                {
                    fontSize: '9px',
                    color: '#888888',
                    fontFamily: 'monospace'
                }
            ).setDepth(1002);
            
            this.layerItems[layer.id] = {
                bg: itemBg,
                name: nameText,
                checkbox: checkbox,
                depth: depthText
            };
            
            yOffset += itemHeight + 2;
        });
        
        // Info panel (shows selected layer info)
        const infoPanelY = yOffset + 10;
        const infoPanelBg = this.scene.add.rectangle(
            this.panelX + this.panelWidth / 2,
            infoPanelY + 40,
            this.panelWidth - 4,
            80,
            0x0f1820,
            0.6
        );
        infoPanelBg.setStrokeStyle(1, this.palette.accent, 0.3);
        infoPanelBg.setDepth(1001);
        this.infoPanelBg = infoPanelBg;
        
        // Info text
        this.infoText = this.scene.add.text(
            this.panelX + 10,
            infoPanelY + 10,
            'Select a layer',
            {
                fontSize: '10px',
                color: this.palette.textMuted,
                fontFamily: 'monospace',
                wordWrap: { width: this.panelWidth - 20 },
                align: 'left'
            }
        ).setDepth(1002);
        
        // Cards section header
        const cardsHeaderY = infoPanelY + 95;
        this.scene.add.text(
            this.panelX + 10,
            cardsHeaderY,
            'CARDS',
            {
                fontSize: '12px',
                color: this.palette.textPrimary,
                fontFamily: 'monospace',
                fontStyle: 'bold'
            }
        ).setDepth(1002);
        
        // Cards list container (scrollable area)
        const cardsListY = cardsHeaderY + 25;
        const cardsListBg = this.scene.add.rectangle(
            this.panelX + this.panelWidth / 2,
            cardsListY + 100,
            this.panelWidth - 4,
            200,
            0x0a0a0a,
            0.7
        );
        cardsListBg.setStrokeStyle(1, this.palette.accent, 0.2);
        cardsListBg.setDepth(1001);
        this.cardsListBg = cardsListBg;
        
        this.cardsListY = cardsListY;
    }
    
    updateCardsList(cards) {
        this.cards = cards;
        
        // Clear previous card items
        Object.values(this.cardItems).forEach(item => {
            if (item.bg) item.bg.destroy();
            if (item.text) item.text.destroy();
            if (item.status) item.status.destroy();
        });
        this.cardItems = {};
        
        // Create card list items
        let cardYOffset = this.cardsListY;
        const cardItemHeight = 40;
        
        cards.forEach((card, index) => {
            const cardId = `card_${index}`;
            const isSelected = this.selectedCard === cardId;
            
            // Card item background
            const cardItemBg = this.scene.add.rectangle(
                this.panelX + this.panelWidth / 2,
                cardYOffset + cardItemHeight / 2,
                this.panelWidth - 8,
                cardItemHeight - 4,
                isSelected ? 0x1a3a3a : 0x0f1820,
                0.5
            );
            cardItemBg.setStrokeStyle(1, this.palette.neon, isSelected ? 0.7 : 0.3);
            cardItemBg.setDepth(1002);
            cardItemBg.setInteractive();
            
            // Hover effect
            cardItemBg.on('pointerover', () => {
                cardItemBg.setFillStyle(isSelected ? 0x1a3a3a : 0x1a2a30, 0.7);
            });
            cardItemBg.on('pointerout', () => {
                cardItemBg.setFillStyle(isSelected ? 0x1a3a3a : 0x0f1820, 0.5);
            });
            
            // Click to select
            cardItemBg.on('pointerdown', () => {
                this.selectCard(cardId, card);
            });
            
            // Card label (preview first 20 chars)
            const cardText = card.text.text.substring(0, 18) + (card.text.text.length > 18 ? '...' : '');
            const cardLabel = this.scene.add.text(
                this.panelX + 12,
                cardYOffset + 10,
                `${index + 1}. ${cardText}`,
                {
                    fontSize: '9px',
                    color: this.palette.textPrimary,
                    fontFamily: 'monospace'
                }
            ).setDepth(1003);
            
            // Card dimensions
            const cardStatus = this.scene.add.text(
                this.panelX + 12,
                cardYOffset + 25,
                `${card.width.toFixed(0)}×${card.height.toFixed(0)}`,
                {
                    fontSize: '8px',
                    color: '#888888',
                    fontFamily: 'monospace'
                }
            ).setDepth(1003);
            
            this.cardItems[cardId] = {
                bg: cardItemBg,
                text: cardLabel,
                status: cardStatus,
                card: card
            };
            
            cardYOffset += cardItemHeight + 2;
        });
    }
    
    selectCard(cardId, card) {
        // Deselect previous
        if (this.selectedCard && this.cardItems[this.selectedCard]) {
            const prevItem = this.cardItems[this.selectedCard];
            prevItem.bg.setFillStyle(0x0f1820, 0.5);
            prevItem.bg.setStrokeStyle(1, this.palette.neon, 0.3);
        }
        
        this.selectedCard = cardId;
        
        // Highlight selected
        const selectedItem = this.cardItems[cardId];
        selectedItem.bg.setFillStyle(0x1a3a3a, 0.5);
        selectedItem.bg.setStrokeStyle(1, this.palette.neon, 0.7);
        
        // Show card info
        const info = `${card.text.text.substring(0, 30)}\nW: ${card.width.toFixed(0)}\nH: ${card.height.toFixed(0)}\nX: ${card.container.x.toFixed(0)}\nY: ${card.container.y.toFixed(0)}`;
        this.infoText.setText(info);
    }
    
    selectLayer(layerId) {
        // Deselect previous
        if (this.selectedLayer && this.layerItems[this.selectedLayer]) {
            const prevItem = this.layerItems[this.selectedLayer];
            prevItem.bg.setFillStyle(0x0f1820, 0.6);
        }
        
        this.selectedLayer = layerId;
        
        // Highlight selected
        const selectedItem = this.layerItems[layerId];
        selectedItem.bg.setFillStyle(0x1a3a3a, 0.6);
        
        // Update info
        const layer = this.layers.find(l => l.id === layerId);
        const info = `${layer.name}\nDepth: ${layer.depth}\nType: ${layer.type}\nStatus: ${layer.active ? 'ACTIVE' : 'INACTIVE'}`;
        this.infoText.setText(info);
    }
    
    toggleLayer(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        if (!layer) return;
        
        layer.active = !layer.active;
        
        // Update checkbox
        const item = this.layerItems[layerId];
        item.checkbox.setFillStyle(layer.active ? 0x00ff00 : 0x333333, 0.5);
        item.checkbox.setStrokeStyle(1, layer.active ? this.palette.neon : 0x666666, 0.7);
        
        // Update text color
        item.name.setColor(layer.active ? this.palette.textPrimary : '#666666');
        item.bg.setStrokeStyle(1, layer.active ? this.palette.neon : 0x444444, layer.active ? 0.6 : 0.3);
        
        // Toggle visibility in scene
        this.toggleVisibility(layerId, layer.active);
        
        // Update info if this layer is selected
        if (this.selectedLayer === layerId) {
            this.selectLayer(layerId);
        }
    }
    
    toggleVisibility(layerId, isActive) {
        const objects = this.layerObjects[layerId];
        if (!objects) return;
        
        objects.forEach(obj => {
            if (obj && obj.setVisible) {
                obj.setVisible(isActive);
            }
        });
    }
    
    registerLayerObject(layerId, obj) {
        if (!this.layerObjects[layerId]) {
            this.layerObjects[layerId] = [];
        }
        this.layerObjects[layerId].push(obj);
    }
    
    registerLayerGroup(layerId, objects) {
        this.layerObjects[layerId] = objects;
    }
}
