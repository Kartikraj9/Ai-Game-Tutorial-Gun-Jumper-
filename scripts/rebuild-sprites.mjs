/**
 * Rebuild sprite sheets from new character assets.
 * Applies manual scaling to each animation so the goblin's body size
 * is consistent across all states, then packs them into a uniform 512x600 cell.
 */
import { readdir, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const CHAR_DIR = './assets/Character';
const OUTPUT_DIR = './public/spritesheets';

// Uniform cell size for all packed sprites
const CELL_W = 512;
const CELL_H = 600;

// Manual scale factors to make the goblin visually the same size across all animations
// Since Idle was 916px tall and Run was 407px, we need to scale them to match.
const folders = [
    { src: 'Idle',       out: 'idle',      scale: 0.53 },
    { src: 'Run Left',   out: 'run_left',  scale: 1.1  },
    { src: 'Run RIght',  out: 'run_right', scale: 1.1  },
    { src: 'Fall',       out: 'fall',      scale: 0.85 },
    { src: 'Fly',        out: 'fly',       scale: 1.0  },
];

async function getFrames(folderSrc) {
    const srcDir = join(CHAR_DIR, folderSrc);
    const files = (await readdir(srcDir)).filter(f => f.endsWith('.png')).sort();
    return files.map(f => join(srcDir, f));
}

async function main() {
    console.log('🔧 Normalizing and packing sprites...\n');
    await mkdir(OUTPUT_DIR, { recursive: true });

    for (const folder of folders) {
        const frames = await getFrames(folder.src);
        const frameCount = frames.length;
        const sheetWidth = CELL_W * frameCount;
        const sheetHeight = CELL_H;

        const composites = [];

        for (let i = 0; i < frameCount; i++) {
            const framePath = frames[i];
            
            // Get original dimensions
            let meta = await sharp(framePath).metadata();
            
            const scaledW = Math.round(meta.width * folder.scale);
            const scaledH = Math.round(meta.height * folder.scale);

            // Resize frame to normalized size
            const buffer = await sharp(framePath)
                .resize(scaledW, scaledH) // Using default smooth scaling since AI art is high-res
                .png()
                .toBuffer();

            // Center horizontally, align to bottom (with a small 20px padding from the very bottom)
            // For 'Fly', the fire extends downwards, so we might want to lift it slightly higher
            let offsetY = CELL_H - scaledH - 20; 
            if (folder.src === 'Fly') {
                offsetY = CELL_H - scaledH; // Let fire touch the absolute bottom
            }

            const offsetX = i * CELL_W + Math.floor((CELL_W - scaledW) / 2);

            composites.push({
                input: buffer,
                left: offsetX,
                top: offsetY,
            });
        }

        // Pack into sheet
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
        .toFile(join(OUTPUT_DIR, `${folder.out}.png`));

        console.log(`  ✓ ${folder.out}: ${frameCount} frames → ${sheetWidth}x${sheetHeight}`);
    }

    console.log(`\n✅ All sprite sheets normalized to a ${CELL_W}x${CELL_H} grid!`);
}

main().catch(console.error);
