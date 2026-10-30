import Phaser from 'phaser';
import { Player } from '../entities/Player.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Setup world
        this.createBackground();

        // Setup physics groups
        this.bullets = this.physics.add.group();
        this.platforms = this.physics.add.staticGroup();
        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.hazards = this.physics.add.group({ allowGravity: false, immovable: true });
        this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
        this.mushrooms = this.physics.add.staticGroup();
        this.healthPickups = this.physics.add.group({ allowGravity: false, immovable: true });

        // Generate Massive Level
        this.generateLevel();

        // Setup Player
        this.player = new Player(this, 200, 350);

        // Track landing for SFX
        this.wasOnGround = false;

        // Create UI
        this.createHUD();
        this.createControlHints();

        // --- Physics Collisions & Overlaps ---
        this.physics.add.collider(this.player.sprite, this.platforms);
        this.physics.add.collider(this.player.sprite, this.movingPlatforms, this.ridePlatform, null, this);
        this.physics.add.collider(this.bullets, this.platforms, (bullet) => {
            this.sound.play('sfx_bullet_impact', { volume: 0.4 });
            bullet.destroy();
        });
        this.physics.add.collider(this.player.sprite, this.mushrooms, this.bounceMushroom, null, this);

        this.physics.add.overlap(this.player.sprite, this.coins, this.collectCoin, null, this);
        this.physics.add.overlap(this.player.sprite, this.hazards, this.playerHit, null, this);
        this.physics.add.overlap(this.player.sprite, this.healthPickups, this.collectHealth, null, this);
        this.physics.add.overlap(this.player.sprite, this.finishZone, this.winGame, null, this);

        // Camera & Huge World Bounds
        this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(100, 50);
        this.physics.world.setBounds(0, -1000, 64000, 2000); // 64k pixels wide!
        this.cameras.main.setBounds(0, -1000, 64000, 2000);

        // Fade in from black on start
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // --- Music: Start with early level music ---
        this.currentMusicKey = null;
        this.currentMusic = null;
        this.startMusic('music_early');

        // Track last health pickup position for spacing
        this.lastHealthX = 0;

        // --- Pause on ESC ---
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.gameWon) return;
            this.sound.play('sfx_pause_open', { volume: 0.5 });
            if (this.currentMusic) this.currentMusic.setVolume(0.15);
            this.scene.pause();
            this.scene.launch('PauseMenuScene');
        });

        // Resume event — restore music volume and eat the click
        this.events.on('resume', () => {
            if (this.currentMusic) this.currentMusic.setVolume(0.5);
            // Eat the next pointerdown so resuming doesn't fire the gun
            this.player.lastFireTime = this.time.now + 300;
        });

        this.gameWon = false;
    }

    startMusic(key) {
        if (this.currentMusicKey === key) return;

        // Immediately set the key so we don't trigger this every frame during the fade
        this.currentMusicKey = key;

        if (this.currentMusic) {
            this.tweens.add({
                targets: this.currentMusic,
                volume: 0,
                duration: 500,
                onComplete: () => {
                    this.currentMusic.stop();
                    this.currentMusic.destroy();
                    this.currentMusic = this.sound.add(key, { loop: true, volume: 0 });
                    this.currentMusic.play();
                    this.tweens.add({ targets: this.currentMusic, volume: 0.5, duration: 1000 });
                }
            });
        } else {
            this.currentMusic = this.sound.add(key, { loop: true, volume: 0 });
            this.currentMusic.play();
            this.tweens.add({ targets: this.currentMusic, volume: 0.5, duration: 1500 });
        }
    }

    createBackground() {
        const w = 960;
        const h = 540; // Screen dimensions

        // Use tileSprite pinned to camera, and scroll its UVs in update()
        this.bgSky = this.add.tileSprite(0, 0, w, h, 'bg_sky').setOrigin(0, 0).setScrollFactor(0);
        this.bgMountains = this.add.tileSprite(0, 0, w, h, 'bg_mountains').setOrigin(0, 0).setScrollFactor(0);
        this.bgHills = this.add.tileSprite(0, 0, w, h, 'bg_hills').setOrigin(0, 0).setScrollFactor(0);
    }

    addPlatform(x, y, width, height, isMetal = false) {
        const topTile = isMetal ? 'tile_metal' : 'tile_grass';
        const bodyTile = isMetal ? 'tile_metal' : 'tile_dirt';

        const overlap = isMetal ? 0 : 125;
        if (height > 128) {
            this.add.tileSprite(x, y + 128 - overlap, width, height - 128 + overlap, bodyTile).setOrigin(0, 0);
        }
        const topHeight = Math.min(height, 128);
        this.add.tileSprite(x, y, width, topHeight, topTile).setOrigin(0, 0);

        const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
        this.physics.add.existing(zone, true);
        this.platforms.add(zone);
    }

    addMovingPlatform(x, y, distanceX = 400, distanceY = 0) {
        const width = 256;
        const height = 128;

        const platSprite = this.add.tileSprite(x, y, width, height, 'tile_metal').setOrigin(0.5, 0.5);
        this.movingPlatforms.add(platSprite);
        platSprite.body.setSize(width, height);

        this.tweens.add({
            targets: platSprite,
            x: x + distanceX,
            y: y + distanceY,
            duration: distanceY !== 0 ? 3000 : 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    addHazard(x, y, type, isCeiling = false, behavior = null) {
        let tex = type;
        if (type === 'spike_trap') tex = 'spike_trap_close'; // start closed

        const hazard = this.hazards.create(x, y, tex);
        hazard.setScale(0.8);

        if (type === 'sawblade') {
            // Shrink radius from 45 down to 35, and center it perfectly in the 128x128 box (29 offset)
            hazard.body.setCircle(35, 29, 29);
            hazard.isSawblade = true;
            hazard.y -= 32; // sawblades hover
            // Give each sawblade a unique phase offset so they don't all sync
            hazard.sawPhaseOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
        } else if (type === 'spike_trap') {
            hazard.y = y - 51;
            // Pointy part is at the top
            hazard.body.setSize(60, 50);
            hazard.body.setOffset(34, 20);
            hazard.body.enable = false; // Start closed (safe)

            // Pop-up timer logic with sound
            this.time.addEvent({
                delay: Phaser.Math.Between(1500, 2500),
                loop: true,
                callback: () => {
                    const isOpen = hazard.texture.key === 'spike_trap_open';
                    hazard.setTexture(isOpen ? 'spike_trap_close' : 'spike_trap_open');
                    hazard.body.enable = !isOpen; // Only hurt when open

                    // Play spike trap sound if near player (within 800px)
                    if (this.player && Math.abs(hazard.x - this.player.sprite.x) < 800) {
                        this.sound.play(isOpen ? 'sfx_spike_close' : 'sfx_spike_open', { volume: 0.25 });
                    }
                }
            });
        } else {
            // Normal Spikes (128x128 image, scaled to ~102x102)
            if (isCeiling) {
                hazard.y = y + 51; // Hang down from ceiling
                hazard.setFlipY(true);
                // Pointy part is now at the bottom
                hazard.body.setSize(60, 50);
                hazard.body.setOffset(34, 78);
            } else {
                hazard.y = y - 51; // Sit on top of floor
                // Pointy part is at the top
                hazard.body.setSize(60, 50);
                hazard.body.setOffset(34, 20);
            }

            // Piston behavior (smashes down or pops up)
            if (behavior === 'piston') {
                const moveDist = isCeiling ? 200 : -200;
                this.tweens.add({
                    targets: hazard,
                    y: hazard.y + moveDist,
                    duration: 500,
                    hold: 1000,
                    ease: 'Stepped',
                    easeParams: [10],
                    yoyo: true,
                    repeat: -1,
                    delay: (x % 1000) // Staggered smashing based on X position
                });
            }
        }
        return hazard;
    }

    addCoin(x, y) {
        const coin = this.coins.create(x, y, 'coin');
        coin.play('anim_coin');
        coin.body.setSize(40, 40);
    }

    /** Add an arc of coins to guide jumps and reward skill */
    addCoinArc(startX, startY, endX, endY, count = 5) {
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const x = Phaser.Math.Linear(startX, endX, t);
            // Parabolic arc peaking in the middle
            const arcHeight = -120;
            const y = Phaser.Math.Linear(startY, endY, t) + arcHeight * Math.sin(t * Math.PI);
            this.addCoin(x, y);
        }
    }

    addMushroom(x, y) {
        const mush = this.mushrooms.create(x, y + 20, 'mushroom');
        mush.setScale(0.7);

        // Refresh first to apply scale to the base physics body
        mush.refreshBody();

        // Then shrink and shift the static body to tightly wrap the mushroom's cap
        // The image is 128x128. Cap is roughly from x=30 to x=98 (width 68) and y=40 to y=70 (height 30)
        mush.body.width = 68 * 0.7;
        mush.body.height = 30 * 0.7;

        // Shift the position to match the cap (using the unscaled offsets multiplied by scale)
        mush.body.position.x += 30 * 0.7;
        mush.body.position.y += 40 * 0.7;
    }

    addHealthPickup(x, y) {
        const hp = this.healthPickups.create(x, y, 'heart_full');
        hp.setScale(0.6);
        hp.body.setSize(40, 40);

        // Gentle floating animation
        this.tweens.add({
            targets: hp,
            y: y - 10,
            duration: 1200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Subtle glow pulse
        this.tweens.add({
            targets: hp,
            alpha: { from: 0.7, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    generateLevel() {
        let cursorX = 0;
        const baseGroundY = 500;
        let lastHardChunkEnd = 0; // Track where hard sections end for health placement
        let healthPlacedCount = 0;
        const MAX_HEALTH_PICKUPS = 10;

        // Phase 1: Safe Start
        this.addPlatform(cursorX, baseGroundY, 2000, 400);
        // Starting coin trail to teach the player
        for (let cx = 300; cx < 1800; cx += 200) {
            this.addCoin(cx, baseGroundY - 100);
        }
        cursorX += 2000;

        // Procedural Chunk Loop
        while (cursorX < 62000) {
            // Determine difficulty phase based on distance
            let phase = 1;
            if (cursorX > 8000) phase = 2;
            if (cursorX > 20000) phase = 3;
            if (cursorX > 36000) phase = 4;
            if (cursorX > 48000) phase = 5;

            // Pick a random chunk available to this phase
            const chunkType = Phaser.Math.Between(1, Math.min(phase + 4, 9)); // Max 9 chunk types!
            const isHardChunk = chunkType >= 6;
            const chunkStartX = cursorX;

            if (chunkType === 1) { // Gap Jump
                const gap = Phaser.Math.Between(300, 400 + phase * 50); // Wider in later phases
                cursorX += gap;
                this.addPlatform(cursorX, baseGroundY, 800, 400);
                // Coin arc guiding the jump
                this.addCoinArc(cursorX - gap + 100, baseGroundY - 80, cursorX + 200, baseGroundY - 80, 3);
                this.addCoin(cursorX + 400, baseGroundY - 150);
                cursorX += 800;
            }
            else if (chunkType === 2) { // Spike Pit
                const pitWidth = Phaser.Math.Between(600, 800 + phase * 80);
                this.addPlatform(cursorX, baseGroundY + 150, pitWidth, 400, true);
                for (let sx = cursorX + 128; sx < cursorX + pitWidth - 128; sx += 128) {
                    this.addHazard(sx, baseGroundY + 150, 'spike');
                }
                // Risk-reward coins floating above spikes
                for (let sx = cursorX + 200; sx < cursorX + pitWidth - 200; sx += 200) {
                    this.addCoin(sx, baseGroundY - 50);
                }
                cursorX += pitWidth;
                this.addPlatform(cursorX, baseGroundY, 400, 400);
                cursorX += 400;
            }
            else if (chunkType === 3) { // Sawblade Patrol
                const gap = 400;
                cursorX += gap;
                this.addPlatform(cursorX, baseGroundY - 100, 512, 128, true);
                this.addHazard(cursorX + 256, baseGroundY - 100, 'sawblade');
                // Coin line through the danger zone
                this.addCoin(cursorX + 128, baseGroundY - 300);
                this.addCoin(cursorX + 256, baseGroundY - 300);
                this.addCoin(cursorX + 384, baseGroundY - 300);
                cursorX += 512 + gap;
                this.addPlatform(cursorX, baseGroundY, 600, 400);
                cursorX += 600;
            }
            else if (chunkType === 4) { // Mushroom High Wall
                cursorX += 200; // Gap before wall challenge
                this.addPlatform(cursorX, baseGroundY, 400, 400); // Approach floor
                this.addMushroom(cursorX + 200, baseGroundY - 20); // Mushroom securely on approach floor
                cursorX += 400; // Move past approach floor
                this.addPlatform(cursorX, baseGroundY - 400, 256, 800, true); // The High Wall
                // Coin arc over the wall
                this.addCoinArc(cursorX - 100, baseGroundY - 350, cursorX + 350, baseGroundY - 350, 5);
                this.addCoin(cursorX + 128, baseGroundY - 550); // Reward for clearing it
                cursorX += 256;
                this.addPlatform(cursorX, baseGroundY, 600, 400); // Safe landing on the other side
                cursorX += 600;
            }
            else if (chunkType === 5) { // Steampunk Gauntlet
                cursorX += 400;
                this.addPlatform(cursorX, baseGroundY - 200, 256, 128, true);
                this.addHazard(cursorX + 128, baseGroundY - 200, 'sawblade');
                this.addCoin(cursorX + 128, baseGroundY - 400);
                cursorX += 400;
                this.addPlatform(cursorX, baseGroundY - 400, 256, 128, true);
                this.addMushroom(cursorX + 128, baseGroundY - 400 - 20);
                this.addCoin(cursorX + 128, baseGroundY - 600);
                cursorX += 500;
                this.addPlatform(cursorX, baseGroundY, 800, 400);
                cursorX += 800;
            }
            else if (chunkType === 6) { // Claustrophobic Tunnel with PISTON spikes!
                this.addPlatform(cursorX, baseGroundY, 1500, 400, true);
                this.addPlatform(cursorX, baseGroundY - 500, 1500, 256, true); // Ceiling
                for (let sx = cursorX + 200; sx < cursorX + 1300; sx += 256) {
                    // Spikes on ceiling that smash down like pistons!
                    this.addHazard(sx, baseGroundY - 244, 'spike', true, 'piston');
                    this.addCoin(sx + 128, baseGroundY - 150); // Risk vs Reward
                }
                cursorX += 1500;
            }
            else if (chunkType === 7) { // Moving Platform Gap
                const gap = 1200; // HUGE gap
                cursorX += 200;

                // Add two moving platforms traversing the gap
                this.addMovingPlatform(cursorX, baseGroundY - 100, 400);
                this.addMovingPlatform(cursorX + 600, baseGroundY + 100, -400);

                // Coin arc guiding the jump path
                this.addCoinArc(cursorX, baseGroundY - 200, cursorX + 1200, baseGroundY - 200, 5);

                cursorX += gap;
                this.addPlatform(cursorX, baseGroundY, 600, 400);
                cursorX += 600;
            }
            else if (chunkType === 8) { // Pop-up Trap Floor
                this.addPlatform(cursorX, baseGroundY, 1200, 400, true);
                for (let sx = cursorX + 200; sx < cursorX + 1100; sx += 256) {
                    this.addHazard(sx, baseGroundY, 'spike_trap'); // Pops up randomly!
                    this.addCoin(sx, baseGroundY - 200);
                }
                cursorX += 1200;
            }
            else if (chunkType === 9) { // Vertical Elevator Shaft
                cursorX += 200;

                // Platforms moving UP and DOWN to reach a high ledge
                this.addMovingPlatform(cursorX, baseGroundY - 100, 0, -500);
                this.addMovingPlatform(cursorX + 400, baseGroundY - 400, 0, 500);

                this.addCoin(cursorX, baseGroundY - 500);
                this.addCoin(cursorX + 400, baseGroundY - 100);
                this.addCoin(cursorX + 200, baseGroundY - 700);

                cursorX += 800;
                this.addPlatform(cursorX, baseGroundY - 600, 600, 1000, true); // High ledge
                cursorX += 600;

                // Safely drop back down
                this.addPlatform(cursorX, baseGroundY, 600, 400);
                cursorX += 600;
            }

            // --- Health Pickup Placement: Only after hard chunks, spaced out ---
            if (isHardChunk && healthPlacedCount < MAX_HEALTH_PICKUPS) {
                const distSinceLastHealth = cursorX - lastHardChunkEnd;
                // Only place if we're 6000+ px from the last one (challenging spacing)
                if (distSinceLastHealth > 6000 || (phase >= 4 && distSinceLastHealth > 4000)) {
                    // Place on the safe platform after the hard chunk
                    this.addHealthPickup(cursorX - 300, baseGroundY - 100);
                    lastHardChunkEnd = cursorX;
                    healthPlacedCount++;
                }
            }
        }

        // Finish Line Zone (62k - 64k)
        this.addPlatform(cursorX, baseGroundY, 2000, 400);
        this.finishZone = this.add.zone(cursorX + 1000, baseGroundY - 300, 300, 600);
        this.physics.add.existing(this.finishZone, true);

        // Huge golden gear marker
        const winMarker = this.add.sprite(cursorX + 1000, baseGroundY - 300, 'coin');
        winMarker.setScale(4).play('anim_coin');

        // Final coin trail leading to the finish
        for (let cx = cursorX + 200; cx < cursorX + 900; cx += 100) {
            this.addCoin(cx, baseGroundY - 150);
        }
    }

    createHUD() {
        this.score = 0;
        this.health = 3;
        this.maxHealth = 3;
        this.hearts = [];

        // Health icons - fixed spacing and scale
        for (let i = 0; i < 3; i++) {
            const heart = this.add.image(40 + (i * 60), 40, 'heart_full');
            heart.setScrollFactor(0).setDepth(100).setScale(0.8);
            this.hearts.push(heart);
        }

        // Coin counter
        this.add.sprite(850, 40, 'coin').play('anim_coin').setScrollFactor(0).setDepth(100).setScale(0.45);
        this.scoreText = this.add.text(880, 26, '0', {
            fontFamily: 'monospace', fontSize: '28px', color: '#ffcc00'
        }).setScrollFactor(0).setDepth(100);
    }

    collectCoin(player, coin) {
        coin.destroy();
        this.score += 1;
        this.scoreText.setText(this.score.toString());
        this.sound.play('sfx_coin', { volume: 0.5 });

        // Little bounce effect on text
        this.tweens.add({
            targets: this.scoreText,
            scale: 1.5,
            duration: 100,
            yoyo: true
        });
    }

    collectHealth(playerSprite, pickup) {
        if (this.health >= this.maxHealth) return; // Already full, don't waste it

        pickup.destroy();
        this.health = Math.min(this.maxHealth, this.health + 1);
        this.sound.play('sfx_health_pickup', { volume: 0.6 });

        // Update heart UI
        for (let i = 0; i < this.maxHealth; i++) {
            this.hearts[i].setTexture(i < this.health ? 'heart_full' : 'heart_empty');
        }

        // Green flash feedback
        this.player.sprite.setTint(0x00ff88);
        this.time.delayedCall(300, () => {
            if (this.player.sprite.active && !this.player.isInvulnerable) {
                this.player.sprite.clearTint();
            }
        });

        // Heal text popup
        const healText = this.add.text(this.player.sprite.x, this.player.sprite.y - 60, '+1 HP', {
            fontFamily: 'monospace', fontSize: '16px', color: '#00ff88',
            stroke: '#003311', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: healText,
            y: healText.y - 40,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => healText.destroy()
        });
    }

    playerHit(playerSprite, hazard) {
        if (this.player.isInvulnerable) return;

        // Take damage
        this.health -= 1;

        // Update UI
        if (this.health >= 0 && this.health < this.maxHealth) {
            this.hearts[this.health].setTexture('heart_empty');
        }

        // Knockback
        this.player.sprite.body.setVelocity(-200, -300);

        // Invulnerability frames
        this.player.isInvulnerable = true;
        this.player.sprite.setTint(0xff0000);

        // Die or survive
        if (this.health <= 0) {
            this.sound.play('sfx_player_death', { volume: 0.7 });

            // Brief death freeze before restart
            this.player.sprite.body.setVelocity(0, -400);
            this.player.sprite.setTint(0xff0000);
            this.physics.pause();

            // Camera shake
            this.cameras.main.shake(300, 0.02);

            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                if (this.currentMusic) {
                    this.currentMusic.stop();
                    this.currentMusic.destroy();
                    this.currentMusic = null;
                    this.currentMusicKey = null;
                }
                this.scene.restart();
            });
        } else {
            this.sound.play('sfx_player_hit', { volume: 0.6 });

            // Flash invulnerability with blinking
            let blinkCount = 0;
            const blinkEvent = this.time.addEvent({
                delay: 100,
                repeat: 9,
                callback: () => {
                    blinkCount++;
                    this.player.sprite.setAlpha(blinkCount % 2 === 0 ? 1 : 0.3);
                }
            });

            this.time.delayedCall(1000, () => {
                if (this.player.sprite.active) {
                    this.player.isInvulnerable = false;
                    this.player.sprite.clearTint();
                    this.player.sprite.setAlpha(1);
                }
            });
        }
    }

    bounceMushroom(playerSprite, mushroom) {
        // More forgiving collision: if player is falling (velocity.y > 0) and touching it
        if (playerSprite.body.velocity.y > 0 || playerSprite.body.touching.down) {
            mushroom.play('anim_mushroom');
            this.sound.play('sfx_mushroom', { volume: 0.5 });
            // Super bounce!
            playerSprite.body.setVelocityY(-1000); // Made it bounce even higher!

            // Revert mushroom animation after a moment
            this.time.delayedCall(300, () => {
                mushroom.anims.stop();
                mushroom.setFrame(0);
            });
        }
    }

    ridePlatform(playerSprite, platform) {
        // Do nothing special, arcade physics handles the collision, 
        // but we can add custom logic here if needed.
    }

    winGame(playerSprite, finishZone) {
        if (this.gameWon) return;
        this.gameWon = true;

        // Stop gameplay music, play victory
        if (this.currentMusic) {
            this.tweens.add({
                targets: this.currentMusic,
                volume: 0,
                duration: 500,
                onComplete: () => { this.currentMusic.stop(); }
            });
        }
        this.sound.play('sfx_level_complete', { volume: 0.8 });
        this.time.delayedCall(500, () => {
            this.sound.play('music_victory', { volume: 0.6 });
        });

        // Freeze player
        this.player.isInvulnerable = true;
        this.player.sprite.body.setAllowGravity(false);
        this.player.sprite.body.setVelocity(0, 0);

        // Show Win Text
        const winText = this.add.text(480, 180, 'LEVEL COMPLETE!', {
            fontFamily: '"Georgia", "Times New Roman", serif', fontSize: '52px',
            color: '#ffcc00', stroke: '#000000', strokeThickness: 8
        }).setScrollFactor(0).setOrigin(0.5).setDepth(200);

        // Score display
        const scoreDisplay = this.add.text(480, 240, `Coins Collected: ${this.score}`, {
            fontFamily: 'monospace', fontSize: '20px',
            color: '#ffdd88', stroke: '#000000', strokeThickness: 4
        }).setScrollFactor(0).setOrigin(0.5).setDepth(200).setAlpha(0);

        // Bounce effect
        this.tweens.add({
            targets: winText,
            scale: { from: 0.5, to: 1.1 },
            duration: 1000,
            ease: 'Elastic.easeOut'
        });

        this.tweens.add({
            targets: scoreDisplay,
            alpha: 1,
            duration: 600,
            delay: 800,
        });

        // Return to menu button after a moment
        this.time.delayedCall(2500, () => {
            const returnText = this.add.text(480, 310, '[ CLICK TO RETURN TO MENU ]', {
                fontFamily: 'monospace', fontSize: '16px',
                color: '#aaffaa', backgroundColor: '#000000aa',
                padding: { x: 16, y: 8 },
            }).setScrollFactor(0).setOrigin(0.5).setDepth(200).setAlpha(0)
                .setInteractive({ useHandCursor: true });

            this.tweens.add({
                targets: returnText,
                alpha: 1,
                duration: 500,
            });

            // Blink the prompt
            this.tweens.add({
                targets: returnText,
                alpha: { from: 0.6, to: 1 },
                duration: 600,
                yoyo: true,
                repeat: -1,
                delay: 500,
            });

            returnText.on('pointerup', () => {
                if (this.currentMusic) {
                    this.currentMusic.stop();
                    this.currentMusic.destroy();
                    this.currentMusic = null;
                    this.currentMusicKey = null;
                }
                this.scene.start('MainMenuScene');
            });
        });
    }

    createControlHints() {
        const style = {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#aaffaa',
            backgroundColor: '#000000aa',
            padding: { x: 8, y: 6 },
        };

        const hints = this.add.text(10, 105,
            '[ W/A/S/D ] Move   [ MOUSE CLICK ] Fire Blunderbuss & Recoil-Jump',
            style
        );
        hints.setScrollFactor(0);
        hints.setDepth(100);

        // Fade out hints after 8 seconds so they don't clutter
        this.tweens.add({
            targets: hints,
            alpha: 0,
            duration: 1000,
            delay: 8000,
        });
    }

    update(time, delta) {
        if (this.player) {
            this.player.update(time, delta);

            // Death plane (falling off the world)
            if (this.player.sprite.y > 2000) {
                this.sound.play('sfx_player_death', { volume: 0.7 });
                if (this.currentMusic) {
                    this.currentMusic.stop();
                    this.currentMusic.destroy();
                    this.currentMusic = null;
                    this.currentMusicKey = null;
                }
                this.scene.restart();
            }

            // --- Landing detection for SFX ---
            const onGround = this.player.sprite.body.blocked.down || this.player.sprite.body.touching.down;
            if (onGround && !this.wasOnGround) {
                this.sound.play('sfx_landing', { volume: 0.25 });
            }
            this.wasOnGround = onGround;

            // --- Dynamic Music: Switch tracks based on player position ---
            const playerX = this.player.sprite.x;
            if (playerX > 36000 && this.currentMusicKey !== 'music_final') {
                this.startMusic('music_final');
            } else if (playerX > 16000 && playerX <= 36000 && this.currentMusicKey !== 'music_mid') {
                this.startMusic('music_mid');
            }
        }

        // Parallax scrolling
        const camX = this.cameras.main.scrollX;
        if (this.bgSky) this.bgSky.tilePositionX = camX * 0.1;
        if (this.bgMountains) this.bgMountains.tilePositionX = camX * 0.3;
        if (this.bgHills) this.bgHills.tilePositionX = camX * 0.5;

        // Update Hazards (Make sawblades move!)
        if (this.hazards) {
            this.hazards.getChildren().forEach(hazard => {
                if (hazard.isSawblade) {
                    hazard.rotation += 0.15;

                    // Sine wave patrol with unique phase offset per sawblade!
                    if (hazard.startX === undefined) hazard.startX = hazard.x;
                    const phase = hazard.sawPhaseOffset || 0;
                    hazard.x = hazard.startX + Math.sin(time / 400 + phase) * 150;
                }
            });
        }

        // Sync moving platform physics bodies with their visual positions
        if (this.movingPlatforms) {
            this.movingPlatforms.getChildren().forEach(plat => {
                plat.body.updateFromGameObject();
            });
        }
    }
}
