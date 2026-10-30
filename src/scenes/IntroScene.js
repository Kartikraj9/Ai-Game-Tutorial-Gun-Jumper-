import Phaser from 'phaser';

export class IntroScene extends Phaser.Scene {
    constructor() {
        super({ key: 'IntroScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Black background
        this.cameras.main.setBackgroundColor('#000000');

        // Create a DOM element for the video since Phaser's video
        // support requires adding it via the DOM or using Phaser.Video.
        // We use a native HTML5 video element overlaid on the canvas for reliability.
        const video = document.createElement('video');
        video.src = './assets/ui/video/Intro_Video.mp4';
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.style.zIndex = '1000';
        video.style.opacity = '0';
        video.style.transition = 'opacity 1s ease-in';
        video.style.backgroundColor = '#000000';
        video.playsInline = true;
        video.muted = false;
        video.autoplay = false;

        // Append to the game container so it sits on top of the canvas
        const container = document.getElementById('game-container');
        container.style.position = 'relative';
        container.appendChild(video);

        // Fade in the video
        requestAnimationFrame(() => {
            video.style.opacity = '1';
        });

        // Play the video
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Autoplay blocked — try muted
                video.muted = true;
                video.play().catch(() => {
                    // If even muted fails, skip to menu
                    this.skipToMenu(video);
                });
            });
        }

        // When video ends, fade out and go to main menu
        video.addEventListener('ended', () => {
            video.style.transition = 'opacity 0.8s ease-out';
            video.style.opacity = '0';
            setTimeout(() => {
                video.remove();
                this.scene.start('MainMenuScene');
            }, 800);
        });

        // --- Skip prompt ---
        const skipText = this.add.text(width - 20, height - 20, 'Press SPACE or CLICK to skip', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888888',
        }).setOrigin(1, 1).setDepth(10).setAlpha(0);

        // Fade in skip text after 2 seconds
        this.tweens.add({
            targets: skipText,
            alpha: 0.7,
            duration: 800,
            delay: 2000,
        });

        // Skip on SPACE or click
        const skip = () => {
            this.skipToMenu(video);
        };

        this.input.keyboard.on('keydown-SPACE', skip);
        this.input.keyboard.on('keydown-ESC', skip);
        this.input.on('pointerdown', skip);

        // Store reference for cleanup
        this.introVideo = video;
    }

    skipToMenu(video) {
        // Prevent double-skip
        if (this._skipping) return;
        this._skipping = true;

        video.style.transition = 'opacity 0.5s ease-out';
        video.style.opacity = '0';
        video.pause();

        setTimeout(() => {
            video.remove();
            this.scene.start('MainMenuScene');
        }, 500);
    }

    shutdown() {
        // Cleanup if scene is stopped externally
        if (this.introVideo && this.introVideo.parentNode) {
            this.introVideo.pause();
            this.introVideo.remove();
        }
    }
}
