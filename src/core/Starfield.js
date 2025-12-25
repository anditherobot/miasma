import Phaser from 'phaser';

export default class Starfield {
    constructor(scene) {
        this.scene = scene;
        this.stars = [];
        this.graphics = scene.add.graphics({ x: 0, y: 0 });
        this.graphics.setDepth(0); // Background depth
        
        // Initialize stars
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Phaser.Math.Between(0, 800),
                y: Phaser.Math.Between(0, 600),
                size: Phaser.Math.FloatBetween(0.5, 2.5),
                speed: Phaser.Math.FloatBetween(0.1, 1.5),
                alpha: Phaser.Math.FloatBetween(0.3, 1.0)
            });
        }
    }

    update() {
        this.graphics.clear();
        this.graphics.fillStyle(0xffffff, 1);

        this.stars.forEach(star => {
            // Update position
            star.y += star.speed;
            
            // Wrap around
            if (star.y > 600) {
                star.y = 0;
                star.x = Phaser.Math.Between(0, 800);
            }

            // Draw
            this.graphics.globalAlpha = star.alpha;
            this.graphics.fillCircle(star.x, star.y, star.size);
        });
        
        this.graphics.globalAlpha = 1; // Reset
    }

    destroy() {
        this.graphics.destroy();
    }
}
