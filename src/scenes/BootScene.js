import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameras.main.setBackgroundColor('#0a0a1a');

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - 40, 'LOADING...', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#7cfc00'
        }).setOrigin(0.5);

        // Progress bar using graphics
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 10, 320, 20);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x7cfc00, 1);
            progressBar.fillRect(width / 2 - 156, height / 2 - 6, 312 * value, 12);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.setText('READY!');
        });

        // All sprite sheets use uniform 512x600 cell size
        const frameConfig = { frameWidth: 512, frameHeight: 600 };

        this.load.spritesheet('goblin_idle', '/spritesheets/idle.png', frameConfig);
        this.load.spritesheet('goblin_run_left', '/spritesheets/run_left.png', frameConfig);
        this.load.spritesheet('goblin_run_right', '/spritesheets/run_right.png', frameConfig);
        this.load.spritesheet('goblin_fall', '/spritesheets/fall.png', frameConfig);
        this.load.spritesheet('goblin_fly', '/spritesheets/fly.png', frameConfig);

        // Tiles
        this.load.image('tile_grass', '/assets/tiles/Grass_Top_Block.png');
        this.load.image('tile_dirt', '/assets/tiles/Dirt_Center_Block.png');
        this.load.image('tile_metal', '/assets/tiles/Steampunk_Metal_Block.png');

        // Backgrounds
        this.load.image('bg_sky', '/assets/backgrounds/Sky_Layer.png');
        this.load.image('bg_mountains', '/assets/backgrounds/Distant_Mountains.png');
        this.load.image('bg_hills', '/assets/backgrounds/Mid-ground_Hills.png');

        // Hazards
        this.load.image('spike', '/assets/hazards/LargeSpikeOpen.png');
        this.load.image('spike_trap_open', '/assets/hazards/SpikeTrap_Open.png');
        this.load.image('spike_trap_close', '/assets/hazards/SpikeTrap_Close.png');
        this.load.image('sawblade', '/assets/hazards/Redsawblade.png');
        this.load.spritesheet('mushroom', '/assets/hazards/mushroom.png', { frameWidth: 128, frameHeight: 128 });

        // Weapons
        this.load.image('gun', '/assets/weapons/gun.png');
        this.load.image('bullet', '/assets/weapons/bullet.png');
        this.load.spritesheet('explosion', '/assets/weapons/explosion.png', { frameWidth: 215, frameHeight: 233 });

        // UI
        this.load.image('heart_full', '/assets/ui/HealthFull.png');
        this.load.image('heart_empty', '/assets/ui/HealthEmpty.png');
        this.load.spritesheet('coin', '/assets/ui/coin.png', { frameWidth: 64, frameHeight: 64 });

        // Menu UI
        this.load.image('menu_bg', '/assets/ui/MainMenuBackground.png');
        this.load.image('menu_panel', '/assets/ui/Pannel.png');
        this.load.image('btn_play', '/assets/ui/buttons/Play.png');
        this.load.image('btn_continue', '/assets/ui/buttons/Continue.png');
        this.load.image('btn_settings', '/assets/ui/buttons/Settings.png');
        this.load.image('btn_help', '/assets/ui/buttons/Help.png');
        this.load.image('btn_exit', '/assets/ui/buttons/Exit.png');
        this.load.image('btn_load', '/assets/ui/buttons/Load.png');
        this.load.image('btn_save', '/assets/ui/buttons/Save.png');
        this.load.image('btn_achievements', '/assets/ui/buttons/Achievements.png');
        this.load.image('btn_inventory', '/assets/ui/buttons/Inventory.png');
        this.load.image('btn_store', '/assets/ui/buttons/Store.png');

        // Game logo
        this.load.image('game_logo', '/assets/ui/GameTitle_Logo.png');

        // --- Audio: Sound Effects ---
        this.load.audio('sfx_blunderbuss', '/assets/audio/sfx/blunderbuss_fire.mp3');
        this.load.audio('sfx_bullet_impact', '/assets/audio/sfx/bullet_impact.mp3');
        this.load.audio('sfx_explosion', '/assets/audio/sfx/explosion.mp3');
        this.load.audio('sfx_jump', '/assets/audio/sfx/jump.mp3');
        this.load.audio('sfx_landing', '/assets/audio/sfx/landing.mp3');
        this.load.audio('sfx_jetpack', '/assets/audio/sfx/jetpack_thrust.mp3');
        this.load.audio('sfx_coin', '/assets/audio/sfx/coin_collect.mp3');
        this.load.audio('sfx_mushroom', '/assets/audio/sfx/mushroom_bounce.mp3');
        this.load.audio('sfx_health_pickup', '/assets/audio/sfx/health_pickup.mp3');
        this.load.audio('sfx_player_hit', '/assets/audio/sfx/player_hit.mp3');
        this.load.audio('sfx_player_death', '/assets/audio/sfx/player_death.mp3');
        this.load.audio('sfx_sawblade', '/assets/audio/sfx/sawblade_spin.mp3');
        this.load.audio('sfx_spike_open', '/assets/audio/sfx/spike_trap_open.mp3');
        this.load.audio('sfx_spike_close', '/assets/audio/sfx/spike_trap_close.mp3');
        this.load.audio('sfx_level_complete', '/assets/audio/sfx/level_complete.mp3');
        this.load.audio('sfx_btn_hover', '/assets/audio/sfx/button_hover.mp3');
        this.load.audio('sfx_btn_click', '/assets/audio/sfx/button_click.mp3');
        this.load.audio('sfx_pause_open', '/assets/audio/sfx/pause_open.mp3');
        this.load.audio('sfx_pause_close', '/assets/audio/sfx/pause_close.mp3');

        // --- Audio: Music ---
        this.load.audio('music_menu', '/assets/audio/music/menu_theme.mp3');
        this.load.audio('music_early', '/assets/audio/music/music_early.mp3');
        this.load.audio('music_mid', '/assets/audio/music/music_mid.mp3');
        this.load.audio('music_final', '/assets/audio/music/music_final.mp3');
        this.load.audio('music_victory', '/assets/audio/music/victory.mp3');
    }

    create() {
        // Create animations
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('goblin_idle', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'run_left',
            frames: [
                { key: 'goblin_run_left', frame: 6 }, // Contact (far foot lands)
                { key: 'goblin_run_left', frame: 5 }, // Passing (weight transfer)
                { key: 'goblin_run_left', frame: 7 }, // Push-off (foot behind)
                { key: 'goblin_run_left', frame: 8 }, // Flight (mid-air reaching)
                { key: 'goblin_run_left', frame: 3 }, // Contact (near foot lands)
                { key: 'goblin_run_left', frame: 4 }, // Passing (near foot weight)
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'run_right',
            frames: [
                { key: 'goblin_run_right', frame: 7 },
                { key: 'goblin_run_right', frame: 0 },
                { key: 'goblin_run_right', frame: 1 },
                { key: 'goblin_run_right', frame: 2 },
                { key: 'goblin_run_right', frame: 3 },
                { key: 'goblin_run_right', frame: 4 },
                { key: 'goblin_run_right', frame: 5 },
                { key: 'goblin_run_right', frame: 6 },
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'fall',
            frames: this.anims.generateFrameNumbers('goblin_fall', { start: 0, end: 6 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'fly',
            frames: this.anims.generateFrameNumbers('goblin_fly', { start: 0, end: 9 }),
            frameRate: 14,
            repeat: -1
        });

        // Effect animations
        this.anims.create({
            key: 'anim_explosion',
            frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 5 }),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'anim_coin',
            frames: this.anims.generateFrameNumbers('coin', { start: 0, end: 5 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'anim_mushroom',
            frames: this.anims.generateFrameNumbers('mushroom', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });

        // On first launch, play the intro video. After that, go straight to menu.
        const hasSeenIntro = sessionStorage.getItem('intro_seen');
        if (!hasSeenIntro) {
            sessionStorage.setItem('intro_seen', 'true');
            this.scene.start('IntroScene');
        } else {
            this.scene.start('MainMenuScene');
        }
    }
}
