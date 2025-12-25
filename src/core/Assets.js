export default class AssetGenerator {
    static generate(scene) {
        // Player (Red Orb)
        const r = scene.make.graphics();
        r.fillStyle(0xffffff, 1); r.fillCircle(20, 20, 10);
        r.lineStyle(4, 0xff0000, 1); r.strokeCircle(20, 20, 16);
        r.generateTexture('redOrb', 40, 40);
        
        // Sentinel (Blue Orb)
        const b = scene.make.graphics();
        b.lineStyle(2, 0x00ffff, 1); b.strokeCircle(20, 20, 18);
        b.fillStyle(0x0000ff, 1); b.fillCircle(20, 20, 10);
        b.generateTexture('blueOrb', 40, 40);

        // Spike Ring
        const s = scene.make.graphics();
        s.fillStyle(0x00ffff, 1); s.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            s.lineTo(35 + Math.cos(a - 0.2) * 25, 35 + Math.sin(a - 0.2) * 25);
            s.lineTo(35 + Math.cos(a) * 45, 35 + Math.sin(a) * 45);
            s.lineTo(35 + Math.cos(a + 0.2) * 25, 35 + Math.sin(a + 0.2) * 25);
        }
        s.closePath(); s.fill(); 
        s.generateTexture('spikeRing', 70, 70);

        // Miasma Particle
        const m = scene.make.graphics();
        m.fillStyle(0x00ff00, 0.5); m.fillCircle(4, 4, 4);
        m.fillStyle(0xffffff, 0.8); m.fillCircle(4, 4, 2);
        m.generateTexture('miasmaParticle', 8, 8);

        // Safe Zone Texture
        const c = scene.make.graphics().fillStyle(0x00ffcc, 0.3).fillRect(0, 0, 40, 600);
        c.generateTexture('cleanTexture', 40, 600);
        
        // Food Texture
        const f = scene.make.graphics();
        f.fillStyle(0xffaa00, 1); f.fillCircle(5, 5, 5);
        f.generateTexture('foodParticle', 10, 10);

        // Ground Textures
        const g = scene.make.graphics();
        g.fillStyle(0x2d5a27, 1); g.fillRect(0, 0, 40, 40); // Dark Green
        g.generateTexture('grassTexture', 40, 40);

        const mt = scene.make.graphics();
        mt.fillStyle(0x222222, 1); mt.fillRect(0, 0, 40, 40); // Dark Metal
        mt.lineStyle(2, 0x000000, 0.5); mt.strokeRect(0, 0, 40, 40);
        mt.generateTexture('metalTexture', 40, 40);

        // Portal/Gate Texture
        const p = scene.make.graphics();
        p.fillStyle(0x000000, 0.5); p.fillRect(0, 0, 40, 40);
        p.lineStyle(4, 0x00ffff, 1); p.strokeRect(0, 0, 40, 40); // Cyan Border
        p.fillStyle(0x00ffff, 0.2); p.fillRect(4, 4, 32, 32); // Inner Glow
        p.generateTexture('portalTexture', 40, 40);
    }
}
