import Phaser from 'phaser';

export class PauseMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseMenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // --- Dim overlay over the frozen game ---
        this.dimBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
        this.dimBg.setDepth(100);

        // --- Panel ---
        this.panel = this.add.image(width / 2, height / 2, 'menu_panel');
        this.panel.setScale(0.38);
        this.panel.setDepth(101);

        // --- Title on the panel ---
        this.pauseTitle = this.add.text(width / 2, height / 2 - 140, 'PAUSED', {
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: '28px',
            color: '#ffdd55',
            stroke: '#2a1500',
            strokeThickness: 6,
        }).setOrigin(0.5).setDepth(102);

        // --- Pause Menu Buttons ---
        const buttonScale = 0.22;
        const centerX = width / 2;
        const startY = height / 2 - 60;
        const spacing = 60;

        const buttonsData = [
            { key: 'btn_continue', y: startY, action: () => this.resumeGame() },
            { key: 'btn_settings', y: startY + spacing, action: () => this.showPauseSettings() },
            { key: 'btn_help', y: startY + spacing * 2, action: () => this.showPauseHelp() },
            { key: 'btn_exit', y: startY + spacing * 3, action: () => this.exitToMenu() },
        ];

        this.pauseButtons = [];
        this.activeOverlay = null;

        buttonsData.forEach((data, index) => {
            const btn = this.add.image(centerX, data.y, data.key);
            btn.setScale(buttonScale);
            btn.setDepth(102);
            btn.setInteractive({ useHandCursor: true });

            // Entrance animation — staggered scale pop
            btn.setScale(0);
            this.tweens.add({
                targets: btn,
                scale: buttonScale,
                duration: 300,
                delay: 100 + index * 80,
                ease: 'Back.easeOut'
            });

            // Hover
            btn.on('pointerover', () => {
                this.tweens.add({
                    targets: btn,
                    scale: buttonScale * 1.1,
                    duration: 120,
                    ease: 'Back.easeOut'
                });
                btn.setTint(0xffffff);
                this.sound.play('sfx_btn_hover', { volume: 0.3 });
            });

            btn.on('pointerout', () => {
                this.tweens.add({
                    targets: btn,
                    scale: buttonScale,
                    duration: 120,
                    ease: 'Power2'
                });
                btn.clearTint();
            });

            btn.on('pointerdown', () => {
                btn.setScale(buttonScale * 0.92);
                btn.setTint(0xccaa77);
                this.sound.play('sfx_btn_click', { volume: 0.4 });
            });

            btn.on('pointerup', () => {
                btn.setScale(buttonScale * 1.1);
                btn.clearTint();
                data.action();
            });

            this.pauseButtons.push(btn);
        });

        // Panel entrance animation
        this.panel.setScale(0);
        this.tweens.add({
            targets: this.panel,
            scale: 0.38,
            duration: 350,
            ease: 'Back.easeOut'
        });

        this.pauseTitle.setAlpha(0);
        this.tweens.add({
            targets: this.pauseTitle,
            alpha: 1,
            duration: 300,
            delay: 150,
            ease: 'Power2'
        });

        // Dim bg fade in
        this.dimBg.setAlpha(0);
        this.tweens.add({
            targets: this.dimBg,
            alpha: 0.55,
            duration: 200,
        });

        // --- ESC to resume ---
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => {
            if (this.activeOverlay) {
                // Close the overlay first
                this.activeOverlay.forEach(obj => obj.destroy());
                this.activeOverlay = null;
            } else {
                this.resumeGame();
            }
        });
    }

    resumeGame() {
        this.sound.play('sfx_pause_close', { volume: 0.5 });
        // Animate out then resume
        this.tweens.add({
            targets: [this.panel, this.pauseTitle, ...this.pauseButtons],
            scale: 0,
            alpha: 0,
            duration: 200,
            ease: 'Power2'
        });
        this.tweens.add({
            targets: this.dimBg,
            alpha: 0,
            duration: 250,
            onComplete: () => {
                this.scene.resume('GameScene');
                this.scene.stop();
            }
        });
    }

    exitToMenu() {
        this.scene.stop('GameScene');
        this.scene.start('MainMenuScene');
    }

    showPauseSettings() {
        if (this.activeOverlay) return;
        this.createPauseOverlay('SETTINGS', [
            'Music Volume:  ████████░░  80%',
            'SFX Volume:    ██████████  100%',
            'Screen Shake:  ON',
            'Particles:     HIGH',
            '',
            '(Settings are placeholder)',
        ]);
    }

    showPauseHelp() {
        if (this.activeOverlay) return;
        this.createPauseOverlay('CONTROLS', [
            '[ W ]           Jump',
            '[ A / D ]       Move Left / Right',
            '[ SPACE ]       Fly  (uses Fuel)',
            '[ MOUSE CLICK ] Fire Blunderbuss',
            '',
            'Firing creates massive recoil —',
            'use it to launch yourself across',
            'gaps and reach high platforms!',
            '',
            'Collect coins & avoid hazards.',
            'Reach the golden gear to win!',
        ]);
    }

    createPauseOverlay(title, lines) {
        const { width, height } = this.cameras.main;
        const overlayGroup = [];

        // Extra dim
        const extraDim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        extraDim.setDepth(200).setInteractive();
        overlayGroup.push(extraDim);

        // Smaller inner panel
        const innerPanel = this.add.image(width / 2, height / 2, 'menu_panel');
        innerPanel.setScale(0.35);
        innerPanel.setDepth(201);
        overlayGroup.push(innerPanel);

        // Title
        const titleText = this.add.text(width / 2, height / 2 - 130, title, {
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: '20px',
            color: '#ffdd55',
            stroke: '#2a1500',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(202);
        overlayGroup.push(titleText);

        // Content
        const contentText = this.add.text(width / 2, height / 2 - 10, lines.join('\n'), {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ddccaa',
            lineSpacing: 5,
            align: 'left',
        }).setOrigin(0.5).setDepth(202);
        overlayGroup.push(contentText);

        // Close
        const closeBtn = this.add.text(width / 2, height / 2 + 140, '[ CLOSE ]', {
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: '16px',
            color: '#ffcc44',
            stroke: '#1a0f00',
            strokeThickness: 3,
            backgroundColor: '#33221188',
            padding: { x: 16, y: 6 },
        }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });
        overlayGroup.push(closeBtn);

        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#ffcc44'));
        closeBtn.on('pointerup', () => {
            overlayGroup.forEach(obj => obj.destroy());
            this.activeOverlay = null;
        });

        // Animate in
        overlayGroup.forEach(obj => {
            obj.setAlpha(0);
        });
        this.tweens.add({
            targets: overlayGroup,
            alpha: 1,
            duration: 200,
            ease: 'Power2'
        });

        this.activeOverlay = overlayGroup;
    }
}
