import { readdir, mkdir } from 'fs/promises';
import { join, parse } from 'path';
import sharp from 'sharp';

const ASSETS_DIR = './assets';
const PUBLIC_DIR = './public/assets';

// Helper: just trims transparent padding
async function trimPadding(srcPath) {
    return await sharp(srcPath).trim().png().toBuffer();
}

async function processTile(srcPath, outDir, exactDim) {
    const parsed = parse(srcPath);
    const outPath = join(outDir, `${parsed.name.replace(/ /g, '_')}.png`);
    await mkdir(outDir, { recursive: true });

    let buffer = await trimPadding(srcPath);
    
    // Crop off the baked-in dark edges (AI shadows) that make it look like separate blocks!
    const meta = await sharp(buffer).metadata();
    const marginX = Math.floor(meta.width * 0.10); // Crop 10% off edges
    const marginY = Math.floor(meta.height * 0.10);
    
    if (meta.width > marginX * 2 && meta.height > marginY * 2) {
        buffer = await sharp(buffer).extract({
            left: marginX,
            top: marginY,
            width: meta.width - marginX * 2,
            height: meta.height - marginY * 2
        }).toBuffer();
    }

    // Stretch to exact grid size
    await sharp(buffer)
        .resize(exactDim, exactDim, { fit: 'fill' })
        .png()
        .toFile(outPath);
    console.log(`  Processed Tile ${parsed.name} to exact ${exactDim}x${exactDim}`);
}

async function processObject(srcPath, outDir, maxDim) {
    const parsed = parse(srcPath);
    const outPath = join(outDir, `${parsed.name.replace(/ /g, '_')}.png`);
    await mkdir(outDir, { recursive: true });

    let buffer = await trimPadding(srcPath);
    await sharp(buffer)
        .resize({ width: maxDim, height: maxDim, fit: 'inside' })
        .png()
        .toFile(outPath);
    console.log(`  Processed Object ${parsed.name} to max ${maxDim}px`);
}

async function processSpriteSheet(srcDir, outDir, sheetName, maxDim) {
    await mkdir(outDir, { recursive: true });
    const files = (await readdir(srcDir)).filter(f => f.endsWith('.png')).sort();
    if (files.length === 0) return;

    const processedBuffers = [];
    let maxW = 0, maxH = 0;

    for (const f of files) {
        const buffer = await trimPadding(join(srcDir, f));
        const meta = await sharp(buffer).metadata();
        if (meta.width > maxW) maxW = meta.width;
        if (meta.height > maxH) maxH = meta.height;
        processedBuffers.push(buffer);
    }

    const cellW = Math.min(maxW, maxDim);
    const cellH = Math.min(maxH, maxDim);

    const composites = [];
    for (let i = 0; i < processedBuffers.length; i++) {
        let buffer = processedBuffers[i];
        const meta = await sharp(buffer).metadata();
        let fw = meta.width;
        let fh = meta.height;
        
        if (fw > cellW || fh > cellH) {
            buffer = await sharp(buffer).resize({ width: cellW, height: cellH, fit: 'inside' }).png().toBuffer();
            const resizedMeta = await sharp(buffer).metadata();
            fw = resizedMeta.width;
            fh = resizedMeta.height;
        }

        const offsetX = i * cellW + Math.floor((cellW - fw) / 2);
        const offsetY = Math.floor((cellH - fh) / 2); 
        composites.push({ input: buffer, left: offsetX, top: offsetY });
    }

    const sheetWidth = cellW * files.length;
    await sharp({
        create: { width: sheetWidth, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    }).composite(composites).png().toFile(join(outDir, `${sheetName}.png`));

    console.log(`  ✓ Sheet ${sheetName}: ${files.length} frames -> cell ${cellW}x${cellH}`);
}

async function processBackground(srcPath, outDir) {
    const parsed = parse(srcPath);
    const outPath = join(outDir, `${parsed.name.replace(/ /g, '_')}.png`);
    await mkdir(outDir, { recursive: true });
    await sharp(srcPath).resize({ height: 540 }).png().toFile(outPath);
    console.log(`  Resized background ${parsed.name} to height 540px`);
}

async function main() {
    console.log('🔧 Processing game assets...\n');

    const tiles = ['Grass Top Block.png', 'Dirt Center Block.png', 'Steampunk Metal Block.png', 'Grass Left Edge Block.png', 'Grass Right Edge Block.png'];
    for (const t of tiles) await processTile(join(ASSETS_DIR, 'World/Tiles', t), join(PUBLIC_DIR, 'tiles'), 128);

    const bgs = ['Sky Layer.png', 'Distant Mountains.png', 'Mid-ground Hills.png'];
    for (const b of bgs) await processBackground(join(ASSETS_DIR, 'World/Backgrounds', b), join(PUBLIC_DIR, 'backgrounds'));

    await processObject(join(ASSETS_DIR, 'Hazards/SpikeTrap_Open.png'), join(PUBLIC_DIR, 'hazards'), 128);
    await processObject(join(ASSETS_DIR, 'Hazards/SpikeTrap_Close.png'), join(PUBLIC_DIR, 'hazards'), 128);
    await processObject(join(ASSETS_DIR, 'Hazards/LargeSpikeOpen.png'), join(PUBLIC_DIR, 'hazards'), 128);
    await processObject(join(ASSETS_DIR, 'Hazards/Redsawblade.png'), join(PUBLIC_DIR, 'hazards'), 128);
    await processObject(join(ASSETS_DIR, 'Hazards/Yellowsawblade.png'), join(PUBLIC_DIR, 'hazards'), 128);
    await processSpriteSheet(join(ASSETS_DIR, 'Hazards/Mushroom'), join(PUBLIC_DIR, 'hazards'), 'mushroom', 128);

    await processObject(join(ASSETS_DIR, 'Weapons/gun.png'), join(PUBLIC_DIR, 'weapons'), 128);
    await processObject(join(ASSETS_DIR, 'Weapons/bullet.png'), join(PUBLIC_DIR, 'weapons'), 64);
    await processSpriteSheet(join(ASSETS_DIR, 'Weapons/Explosion'), join(PUBLIC_DIR, 'weapons'), 'explosion', 256);

    await processObject(join(ASSETS_DIR, 'UI/HealthFull.png'), join(PUBLIC_DIR, 'ui'), 64);
    await processObject(join(ASSETS_DIR, 'UI/HealthEmpty.png'), join(PUBLIC_DIR, 'ui'), 64);
    await processSpriteSheet(join(ASSETS_DIR, 'UI/Coin'), join(PUBLIC_DIR, 'ui'), 'coin', 64);

    console.log('\n✅ All assets processed and packed!');
}

main().catch(console.error);
