import Phaser from 'phaser';

export class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // Create the sprite using the idle spritesheet
        this.sprite = scene.physics.add.sprite(x, y, 'goblin_idle');
        this.sprite.setScale(0.28); // Increased scale to make character bigger
        this.sprite.setBounce(0.1);

        // Adjust physics body for normalized 512x600 cells
        // The goblin is ~280x380 inside the cell, bottom-aligned
        this.sprite.body.setSize(280, 380);
        this.sprite.body.setOffset(116, 200);

        // Movement constants
        this.MOVE_SPEED = 220;
        this.FLY_FORCE = -380;
        this.MAX_FLY_VELOCITY = -450;
        this.JUMP_VELOCITY = -350;

        // State tracking
        this.state = 'idle'; // idle, running, flying, falling
        this.facingRight = true;
        this.isFlying = false;
        this.flyFuelMax = 100;
        this.flyFuel = this.flyFuelMax;
        this.flyFuelRechargeRate = 40; // per second
        this.flyFuelDrainRate = 50;    // per second

        // Sound tracking
        this.jetpackSound = null;
        this.wasJumping = false;

        // Air ammo tracking
        this.maxAirShots = 3;
        this.airShots = 3;

        // Setup input
        this.cursors = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            fly: Phaser.Input.Keyboard.KeyCodes.SPACE,
        });

        // Fly particle effects
        this.flyParticles = [];
        this.particleTimer = 0;

        // Trail effect
        this.afterImages = [];
        this.afterImageTimer = 0;

        // Weapon config
        this.lastFireTime = 0;
        this.scene.input.on('pointerdown', (pointer) => {
            this.fireWeapon(pointer);
        });

        // Create the gun sprite and attach it to the player
        this.gun = scene.add.sprite(x, y, 'gun');
        this.gun.setScale(0.5);
        this.gun.setOrigin(0.2, 0.5); // Pivot at the handle
        this.gun.setDepth(6); // Put gun in front of player

        // Create fuel bar UI
        this.createFuelBar();

        // Play initial animation
        this.sprite.play('idle');
        this.sprite.setDepth(5);
    }

    createFuelBar() {
        const barX = 20;
        const barY = 85;
        const barWidth = 120;
        const barHeight = 8;

        // Background
        this.fuelBarBg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x222222)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(100);

        // Border
        this.fuelBarBorder = this.scene.add.rectangle(barX - 1, barY - 1, barWidth + 2, barHeight + 2)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(99)
            .setStrokeStyle(1, 0x7cfc00, 0.6);

        // Fill
        this.fuelBarFill = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x7cfc00)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(101);

        // Label
        this.fuelLabel = this.scene.add.text(barX + barWidth + 8, barY - 1, 'FUEL', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#7cfc00',
        }).setScrollFactor(0).setDepth(100).setAlpha(0.8);

        // Ammo Label
        this.ammoLabel = this.scene.add.text(barX, barY + 12, 'AMMO: |||', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffcc00',
        }).setScrollFactor(0).setDepth(100).setAlpha(0.9);
    }

    update(time, delta) {
        const dt = delta / 1000;
        const body = this.sprite.body;
        const onGround = body.blocked.down || body.touching.down;

        // --- Input handling ---
        let moveX = 0;

        if (this.cursors.left.isDown) {
            moveX = -this.MOVE_SPEED;
            this.facingRight = false;
        } else if (this.cursors.right.isDown) {
            moveX = this.MOVE_SPEED;
            this.facingRight = true;
        }

        // Apply horizontal movement
        body.setVelocityX(moveX);

        // --- Aiming and Gun Handling ---
        const pointer = this.scene.input.activePointer;
        // Position gun slightly offset from player center (like in the hands)
        this.gun.setPosition(this.sprite.x, this.sprite.y + 10);
        
        // Aim gun at mouse
        const angle = Phaser.Math.Angle.Between(this.gun.x, this.gun.y, pointer.worldX, pointer.worldY);
        this.gun.setRotation(angle);
        
        // Flip the gun vertically if aiming left so it doesn't look upside down
        this.gun.setFlipY(Math.abs(angle) > Math.PI / 2);

        // --- Flying ---
        this.isFlying = false;
        if (this.cursors.fly.isDown && this.flyFuel > 0) {
            this.isFlying = true;
            this.flyFuel -= this.flyFuelDrainRate * dt;
            if (this.flyFuel < 0) this.flyFuel = 0;

            // Apply upward force
            if (body.velocity.y > this.MAX_FLY_VELOCITY) {
                body.setVelocityY(body.velocity.y + this.FLY_FORCE * dt * 4);
                if (body.velocity.y < this.MAX_FLY_VELOCITY) {
                    body.setVelocityY(this.MAX_FLY_VELOCITY);
                }
            }

            // Start jetpack sound loop
            if (!this.jetpackSound || !this.jetpackSound.isPlaying) {
                this.jetpackSound = this.scene.sound.add('sfx_jetpack', { loop: true, volume: 0.3 });
                this.jetpackSound.play();
            }

            // Spawn fly particles
            this.spawnFlyParticles(dt);
        } else {
            // Stop jetpack sound
            if (this.jetpackSound && this.jetpackSound.isPlaying) {
                this.jetpackSound.stop();
                this.jetpackSound.destroy();
                this.jetpackSound = null;
            }

            // W key for jump (only when on ground)
            if (this.cursors.up.isDown && onGround) {
                body.setVelocityY(this.JUMP_VELOCITY);
                this.scene.sound.play('sfx_jump', { volume: 0.35 });
            }
        }

        // Recharge fuel when on ground and not flying
        if (onGround && !this.isFlying) {
            this.flyFuel = Math.min(this.flyFuelMax, this.flyFuel + this.flyFuelRechargeRate * dt);
        }

        // Reload ammo on ground
        if (onGround) {
            this.airShots = this.maxAirShots;
        }

        // --- Animation State Machine ---
        this.updateAnimation(onGround, moveX);

        // --- Update particle effects ---
        this.updateParticles(dt);

        // --- After image trail when flying ---
        this.updateAfterImages(dt);

        // --- Update Fuel Bar ---
        this.updateFuelBar();
    }

    updateAnimation(onGround, moveX) {
        let newState = this.state;
        const body = this.sprite.body;

        if (this.isFlying) {
            newState = 'flying';
        } else if (!onGround && body.velocity.y > 50) {
            newState = 'falling';
        } else if (!onGround && body.velocity.y < -50) {
            // Jumping up — use fall animation in reverse or a jump state
            newState = 'falling';
        } else if (onGround && moveX !== 0) {
            newState = 'running';
        } else if (onGround) {
            newState = 'idle';
        }

        // Only change animation when state changes
        if (newState !== this.state) {
            this.state = newState;

            switch (this.state) {
                case 'idle':
                    this.sprite.play('idle');
                    break;
                case 'running':
                    if (this.facingRight) {
                        this.sprite.play('run_right');
                    } else {
                        this.sprite.play('run_left');
                    }
                    break;
                case 'falling':
                    this.sprite.play('fall');
                    break;
                case 'flying':
                    this.sprite.play('fly');
                    break;
            }
        }

        // If running and direction changed, swap animation
        if (this.state === 'running') {
            const currentAnim = this.sprite.anims.currentAnim?.key;
            if (this.facingRight && currentAnim !== 'run_right') {
                this.sprite.play('run_right');
            } else if (!this.facingRight && currentAnim !== 'run_left') {
                this.sprite.play('run_left');
            }
        }
    }

    fireWeapon(pointer) {
        const time = this.scene.time.now;
        if (time - this.lastFireTime < 300) return; // 300ms cooldown

        const body = this.sprite.body;
        const onGround = body.blocked.down || body.touching.down;

        if (!onGround) {
            if (this.airShots <= 0) {
                // Out of ammo click sound (dry fire)
                this.scene.sound.play('sfx_btn_hover', { volume: 0.8 });
                return;
            }
            this.airShots--;
        }

        // Play blunderbuss fire sound
        this.scene.sound.play('sfx_blunderbuss', { volume: 0.5 });
        this.lastFireTime = time;

        // Calculate angle from player center to pointer
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, pointer.worldX, pointer.worldY);

        // Apply MASSIVE recoil (opposite direction of aim)
        // If aiming down, it pushes player up. If aiming left, pushes player right.
        const recoilForce = 550;
        const recoilX = -Math.cos(angle) * recoilForce;
        const recoilY = -Math.sin(angle) * recoilForce;

        // Add recoil to current velocity, capped so it doesn't get completely uncontrollable
        let newVx = body.velocity.x + recoilX;
        let newVy = body.velocity.y + recoilY;
        
        // Add a bit of extra lift if firing downward to help with platforming
        if (Math.sin(angle) > 0.5) { 
            newVy -= 150; 
        }

        body.setVelocity(newVx, newVy);

        // Determine weapon tip position
        const radius = 60;
        const tipX = this.sprite.x + Math.cos(angle) * radius;
        const tipY = this.sprite.y + Math.sin(angle) * radius;

        // Spawn Explosion VFX
        const explosion = this.scene.add.sprite(tipX, tipY, 'explosion');
        explosion.setRotation(angle);
        explosion.setScale(0.6); // Explosions should be big and meaty
        explosion.setDepth(10);
        explosion.play('anim_explosion');
        explosion.on('animationcomplete', () => explosion.destroy());
        this.scene.sound.play('sfx_explosion', { volume: 0.3 });

        // Spawn Bullet/Projectile
        const bullet = this.scene.physics.add.sprite(tipX, tipY, 'bullet');
        bullet.setRotation(angle);
        bullet.setScale(0.5);
        bullet.setDepth(9);
        
        // Bullet speed
        const bulletSpeed = 1000;
        bullet.body.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);
        bullet.body.setAllowGravity(false);
        
        // Destroy bullet after 2 seconds to prevent memory leaks
        this.scene.time.delayedCall(2000, () => {
            if (bullet.active) bullet.destroy();
        });

        // Inform GameScene about the bullet for hazard/enemy collisions
        if (this.scene.bullets) {
            this.scene.bullets.add(bullet);
        }
    }

    spawnFlyParticles(dt) {
        this.particleTimer += dt;
        if (this.particleTimer > 0.03) {
            this.particleTimer = 0;

            const px = this.sprite.x + (Math.random() - 0.5) * 20;
            const py = this.sprite.y + this.sprite.displayHeight * 0.35;

            // Fire/thrust particle
            const colors = [0xff6600, 0xff9900, 0xffcc00, 0xff4400, 0xffff00];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 2 + Math.random() * 4;

            const particle = this.scene.add.rectangle(px, py, size, size, color);
            particle.setAlpha(0.9);
            particle.setDepth(5);

            this.flyParticles.push({
                obj: particle,
                vx: (Math.random() - 0.5) * 40,
                vy: 80 + Math.random() * 120,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.3 + Math.random() * 0.3,
            });

            // Smoke particle (less frequent)
            if (Math.random() > 0.5) {
                const smoke = this.scene.add.rectangle(
                    px + (Math.random() - 0.5) * 10,
                    py + 5,
                    3 + Math.random() * 5,
                    3 + Math.random() * 5,
                    0x444444
                );
                smoke.setAlpha(0.4);
                smoke.setDepth(4);

                this.flyParticles.push({
                    obj: smoke,
                    vx: (Math.random() - 0.5) * 20,
                    vy: 30 + Math.random() * 50,
                    life: 0.5 + Math.random() * 0.4,
                    maxLife: 0.5 + Math.random() * 0.4,
                });
            }
        }
    }

    updateParticles(dt) {
        for (let i = this.flyParticles.length - 1; i >= 0; i--) {
            const p = this.flyParticles[i];
            p.life -= dt;

            if (p.life <= 0) {
                p.obj.destroy();
                this.flyParticles.splice(i, 1);
                continue;
            }

            p.obj.x += p.vx * dt;
            p.obj.y += p.vy * dt;
            p.obj.setAlpha((p.life / p.maxLife) * 0.8);
            p.obj.setScale(p.life / p.maxLife);
        }
    }

    updateAfterImages(dt) {
        this.afterImageTimer += dt;

        // Create after-images when flying fast
        if (this.isFlying && this.afterImageTimer > 0.06) {
            this.afterImageTimer = 0;

            const ghost = this.scene.add.sprite(
                this.sprite.x,
                this.sprite.y,
                this.sprite.texture.key,
                this.sprite.frame.name
            );
            ghost.setScale(this.sprite.scaleX, this.sprite.scaleY);
            ghost.setAlpha(0.3);
            ghost.setTint(0x66ff66);
            ghost.setDepth(3);

            this.afterImages.push({
                obj: ghost,
                life: 0.2,
            });
        }

        // Fade out after-images
        for (let i = this.afterImages.length - 1; i >= 0; i--) {
            const ai = this.afterImages[i];
            ai.life -= dt;
            if (ai.life <= 0) {
                ai.obj.destroy();
                this.afterImages.splice(i, 1);
            } else {
                ai.obj.setAlpha(ai.life * 1.5);
            }
        }
    }

    updateFuelBar() {
        const ratio = this.flyFuel / this.flyFuelMax;
        this.fuelBarFill.width = 120 * ratio;

        // Color changes based on fuel level
        if (ratio > 0.5) {
            this.fuelBarFill.fillColor = 0x7cfc00;
            this.fuelBarFill.setAlpha(1);
        } else if (ratio > 0.25) {
            this.fuelBarFill.fillColor = 0xffcc00;
            this.fuelBarFill.setAlpha(1);
        } else {
            this.fuelBarFill.fillColor = 0xff4400;
            // Pulsing effect when low
            this.fuelBarFill.setAlpha(0.7 + Math.sin(Date.now() * 0.01) * 0.3);
        }

        // Update Ammo UI
        const ammoStr = '|'.repeat(this.airShots) + '.'.repeat(this.maxAirShots - this.airShots);
        this.ammoLabel.setText('AMMO: ' + ammoStr);
        if (this.airShots === 0) {
            this.ammoLabel.setColor('#ff4400');
            this.ammoLabel.setAlpha(0.7 + Math.sin(Date.now() * 0.01) * 0.3);
        } else {
            this.ammoLabel.setColor('#ffcc00');
            this.ammoLabel.setAlpha(0.9);
        }
    }
}
