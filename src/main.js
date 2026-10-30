import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PauseMenuScene } from './scenes/PauseMenuScene.js';

window.addEventListener('DOMContentLoaded', () => {
    const config = {
        type: Phaser.AUTO,
        width: 960,
        height: 540,
        parent: 'game-container',
        pixelArt: true,
        roundPixels: true,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 800 },
                debug: false
            }
        },
        scene: [BootScene, IntroScene, MainMenuScene, GameScene, PauseMenuScene],
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        render: {
            antialias: false,
            antialiasGL: false,
        }
    };

    new Phaser.Game(config);
});
