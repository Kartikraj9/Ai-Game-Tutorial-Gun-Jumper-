import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // --- Background ---
        this.bg = this.add.image(width / 2, height / 2, 'menu_bg');
        // Scale background to cover the entire screen
        const scaleX = width / this.bg.width;
        const scaleY = height / this.bg.height;
        const bgScale = Math.max(scaleX, scaleY);
        this.bg.setScale(bgScale);

        // --- Floating Gear Particles (ambient decoration) ---
        this.gears = [];
        for (let i = 0; i < 12; i++) {
            this.createFloatingGear(width, height);
        }

        // --- Dark vignette overlay for depth ---
        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.3);
        vignette.fillRect(0, 0, width, height);
        vignette.setDepth(1);

        // --- Menu Music ---
        if (!this.sound.get('music_menu') || !this.sound.get('music_menu').isPlaying) {
            this.menuMusic = this.sound.add('music_menu', { loop: true, volume: 0 });
            this.menuMusic.play();
            this.tweens.add({ targets: this.menuMusic, volume: 0.5, duration: 1500 });
        }

        // --- Game Title Logo ---
        this.titleLogo = this.add.image(width / 2, 90, 'game_logo');
        // Scale the logo to fit nicely at the top (logo is ~1024x1024, we want ~220px wide)
        const logoTargetWidth = 260;
        const logoScale = logoTargetWidth / this.titleLogo.width;
        this.titleLogo.setScale(logoScale);
        this.titleLogo.setDepth(10);

        // Title float animation
        this.tweens.add({
            targets: this.titleLogo,
            y: '+=6',
            duration: 2200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Title entrance animation
        this.titleLogo.setAlpha(0).setScale(logoScale * 0.5);
        this.tweens.add({
            targets: this.titleLogo,
            alpha: 1,
            scale: logoScale,
            duration: 800,
            ease: 'Back.easeOut'
        });

        // --- Menu Buttons ---
        const buttonScale = 0.28;
        const buttonStartY = 210;
        const buttonSpacing = 75;

        const buttonsData = [
            { key: 'btn_play', y: buttonStartY, action: () => this.startGame(), delay: 200 },
            { key: 'btn_settings', y: buttonStartY + buttonSpacing, action: () => this.showSettings(), delay: 350 },
            { key: 'btn_help', y: buttonStartY + buttonSpacing * 2, action: () => this.showHelp(), delay: 500 },
            { key: 'btn_exit', y: buttonStartY + buttonSpacing * 3, action: () => this.exitGame(), delay: 650 },
        ];

        this.menuButtons = [];

        buttonsData.forEach((data) => {
            const btn = this.add.image(width / 2, data.y, data.key);
            btn.setScale(buttonScale);
            btn.setDepth(10);
            btn.setInteractive({ useHandCursor: true });

            // Entrance animation - slide in from the right
            btn.setAlpha(0);
            btn.x = width / 2 + 200;
            this.tweens.add({
                targets: btn,
                x: width / 2,
                alpha: 1,
                duration: 500,
                delay: data.delay,
                ease: 'Back.easeOut'
            });

            btn.on('pointerover', () => {
                this.tweens.add({
                    targets: btn,
                    scale: buttonScale * 1.1,
                    duration: 150,
                    ease: 'Back.easeOut'
                });
                btn.setTint(0xffffff);
                this.sound.play('sfx_btn_hover', { volume: 0.3 });
            });

            btn.on('pointerout', () => {
                this.tweens.add({
                    targets: btn,
                    scale: buttonScale,
                    duration: 150,
                    ease: 'Power2'
                });
                btn.clearTint();
            });

            btn.on('pointerdown', () => {
                btn.setScale(buttonScale * 0.95);
                btn.setTint(0xccaa77);
                this.sound.play('sfx_btn_click', { volume: 0.4 });
            });

            btn.on('pointerup', () => {
                btn.setScale(buttonScale * 1.1);
                btn.clearTint();
                data.action();
            });

            this.menuButtons.push(btn);
        });

        // --- Version text ---
        this.add.text(width - 10, height - 10, 'v1.0', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#776644',
        }).setOrigin(1, 1).setDepth(10).setAlpha(0.6);

        // --- Bottom hint ---
        const hintText = this.add.text(width / 2, height - 20, '⚙ Press ESC to pause during gameplay', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#aabb88',
        }).setOrigin(0.5, 1).setDepth(10).setAlpha(0);

        this.tweens.add({
            targets: hintText,
            alpha: 0.7,
            duration: 1000,
            delay: 1200,
        });

        // Track active overlay state
        this.activeOverlay = null;
    }

    createFloatingGear(width, height) {
        const x = Phaser.Math.Between(0, width);
        const y = Phaser.Math.Between(0, height);
        const size = Phaser.Math.Between(3, 10);
        const alpha = Phaser.Math.FloatBetween(0.05, 0.2);

        const gear = this.add.graphics();
        gear.fillStyle(0xccaa66, alpha);
        gear.fillCircle(0, 0, size);
        // Add small notch details
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            gear.fillRect(
                Math.cos(a) * (size + 2) - 1.5,
                Math.sin(a) * (size + 2) - 1.5,
                3, 3
            );
        }
        gear.setPosition(x, y);
        gear.setDepth(0);

        const speed = Phaser.Math.FloatBetween(0.002, 0.008);
        const drift = Phaser.Math.FloatBetween(-0.3, 0.3);

        this.gears.push({ obj: gear, speed, drift, baseX: x, baseY: y, angle: Math.random() * Math.PI * 2 });
    }

    startGame() {
        // Fade out music
        if (this.menuMusic) {
            this.tweens.add({
                targets: this.menuMusic,
                volume: 0,
                duration: 400,
                onComplete: () => { this.menuMusic.stop(); this.menuMusic.destroy(); }
            });
        }
        // Fade out then start
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene');
        });
    }

    showSettings() {
        if (this.activeOverlay) return;
        this.createOverlayPanel('SETTINGS', [
            'Music Volume:  ████████░░  80%',
            'SFX Volume:    ██████████  100%',
            'Screen Shake:  ON',
            'Particles:     HIGH',
            '',
            '(Settings are placeholder)',
        ]);
    }

    showHelp() {
        if (this.activeOverlay) return;
        this.createOverlayPanel('CONTROLS', [
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

    exitGame() {
        // In a web game there is no true "exit", so go fullscreen or show message
        this.createOverlayPanel('EXIT', [
            '',
            'Thanks for playing!',
            '',
            'This is a browser game.',
            'Close the tab to exit.',
            '',
            '— Goblin Tinkerer Team —',
        ]);
    }

    createOverlayPanel(title, lines) {
        const { width, height } = this.cameras.main;
        const overlayGroup = [];

        // Dim background
        const dimBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
        dimBg.setDepth(50).setInteractive(); // Block clicks to buttons behind
        overlayGroup.push(dimBg);

        // Panel image
        const panel = this.add.image(width / 2, height / 2, 'menu_panel');
        panel.setScale(0.42);
        panel.setDepth(51);
        overlayGroup.push(panel);

        // Panel title
        const titleText = this.add.text(width / 2, height / 2 - 145, title, {
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: '22px',
            color: '#ffdd55',
            stroke: '#2a1500',
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(52);
        overlayGroup.push(titleText);

        // Panel content
        const contentText = this.add.text(width / 2, height / 2 - 20, lines.join('\n'), {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#ddccaa',
            lineSpacing: 6,
            align: 'left',
        }).setOrigin(0.5).setDepth(52);
        overlayGroup.push(contentText);

        // Close button — use "Exit" style text button
        const closeBtn = this.add.text(width / 2, height / 2 + 155, '[ CLOSE ]', {
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: '18px',
            color: '#ffcc44',
            stroke: '#1a0f00',
            strokeThickness: 4,
            backgroundColor: '#33221188',
            padding: { x: 20, y: 8 },
        }).setOrigin(0.5).setDepth(52).setInteractive({ useHandCursor: true });
        overlayGroup.push(closeBtn);

        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#ffcc44'));
        closeBtn.on('pointerup', () => {
            overlayGroup.forEach(obj => obj.destroy());
            this.activeOverlay = null;
        });

        // Entrance animation
        overlayGroup.forEach(obj => {
            obj.setAlpha(0);
            if (obj !== dimBg) {
                obj.y += 30;
            }
        });
        this.tweens.add({
            targets: overlayGroup,
            alpha: 1,
            y: '-=30',
            duration: 300,
            ease: 'Power2'
        });
        // Dim bg shouldn't move
        dimBg.y = height / 2;

        // ESC to close
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        const escHandler = () => {
            overlayGroup.forEach(obj => obj.destroy());
            this.activeOverlay = null;
            escKey.off('down', escHandler);
        };
        escKey.on('down', escHandler);

        this.activeOverlay = overlayGroup;
    }

    update(time) {
        // Animate floating gears
        this.gears.forEach(g => {
            g.angle += g.speed;
            g.obj.x = g.baseX + Math.sin(g.angle) * 30;
            g.obj.y = g.baseY + Math.cos(g.angle * 0.7) * 20 + g.drift;
            g.obj.rotation = g.angle * 0.5;
        });
    }
}
