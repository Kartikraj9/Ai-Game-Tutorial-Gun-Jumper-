/**
 * Pack individual sprite frames into sprite sheets (one per animation).
 * Each sprite sheet is a horizontal strip of frames, all same size.
 */
import { readdir, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const SPRITE_DIR = './public/sprites';
const OUTPUT_DIR = './public/spritesheets';

const animations = [
    { name: 'idle',      folder: 'idle',      frameCount: 4  },
    { name: 'run_left',  folder: 'run_left',  frameCount: 8  },
    { name: 'run_right', folder: 'run_right', frameCount: 8  },
    { name: 'fall',      folder: 'fall',      frameCount: 9  },
    { name: 'fly',       folder: 'fly',       frameCount: 10 },
];

async function packSheets() {
    await mkdir(OUTPUT_DIR, { recursive: true });

    for (const anim of animations) {
        const srcDir = join(SPRITE_DIR, anim.folder);
        const files = (await readdir(srcDir)).filter(f => f.endsWith('.png')).sort();

        // Get dimensions from first frame
        const firstMeta = await sharp(join(srcDir, files[0])).metadata();
        const fw = firstMeta.width;
        const fh = firstMeta.height;

        // Find max dimensions across all frames for this animation
        let maxW = fw, maxH = fh;
        for (const file of files) {
            const meta = await sharp(join(srcDir, file)).metadata();
            if (meta.width > maxW) maxW = meta.width;
            if (meta.height > maxH) maxH = meta.height;
        }

        // Create horizontal strip
        const sheetWidth = maxW * files.length;
        const sheetHeight = maxH;

        // Prepare composite operations — center each frame in its cell
        const composites = [];
        for (let i = 0; i < files.length; i++) {
            const framePath = join(srcDir, files[i]);
            const frameMeta = await sharp(framePath).metadata();
            const frameBuffer = await sharp(framePath).png().toBuffer();

            const offsetX = i * maxW + Math.floor((maxW - frameMeta.width) / 2);
            const offsetY = Math.floor((maxH - frameMeta.height) / 2);

            composites.push({
                input: frameBuffer,
                left: offsetX,
                top: offsetY,
            });
        }

        await sharp({
            create: {
                width: sheetWidth,
                height: sheetHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
        .composite(composites)
        .png()
        .toFile(join(OUTPUT_DIR, `${anim.name}.png`));

        console.log(`✓ ${anim.name}: ${files.length} frames → ${sheetWidth}x${sheetHeight} (frame: ${maxW}x${maxH})`);
    }

    console.log('\n✅ All sprite sheets packed!');
}

packSheets().catch(console.error);
