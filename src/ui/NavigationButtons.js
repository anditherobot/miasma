/**
 * Utility to add navigation buttons to any scene
 * Adds a "Menu" button to return to MenuScene
 */
export function addNavigationButtons(scene) {
    const padding = 10;
    const buttonWidth = 80;
    const buttonHeight = 40;

    // Menu Button (top-right)
    const menuButton = scene.add.rectangle(
        scene.cameras.main.width - padding - buttonWidth / 2,
        padding + buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        0xff6600
    );
    menuButton.setInteractive();
    menuButton.on('pointerover', () => {
        menuButton.setFillStyle(0xff8800);
    });
    menuButton.on('pointerout', () => {
        menuButton.setFillStyle(0xff6600);
    });
    menuButton.on('pointerdown', () => {
        scene.scene.stop();
        scene.scene.start('MenuScene');
    });

    scene.add.text(
        scene.cameras.main.width - padding - buttonWidth / 2,
        padding + buttonHeight / 2,
        'Menu',
        {
            font: 'bold 14px Arial',
            fill: '#ffffff'
        }
    ).setOrigin(0.5);

    // ESC key shortcut
    scene.input.keyboard.on('keydown-ESC', () => {
        scene.scene.stop();
        scene.scene.start('MenuScene');
    });
}
