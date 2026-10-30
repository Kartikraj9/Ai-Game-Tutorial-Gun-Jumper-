/**
 * Script to convert GIF frames to PNG using Node.js canvas-free approach.
 * Since the GIF files are single-frame sprites, we can use sharp or 
 * a simpler approach with jimp. For maximum compatibility, we'll use
 * the 'sharp' library.
 */
import { readdir, copyFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { execSync } from 'child_process';

const CHAR_DIR = './assets/Character';
const OUTPUT_DIR = './public/sprites';

const folders = ['Fall', 'Fly', 'Idle', 'Run Left', 'Run RIght'];
const outputNames = ['fall', 'fly', 'idle', 'run_left', 'run_right'];

async function convert() {
    // Install sharp temporarily
    console.log('Installing sharp for image conversion...');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });

    const sharp = (await import('sharp')).default;

    for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        const outName = outputNames[i];
        const srcDir = join(CHAR_DIR, folder);
        const outDir = join(OUTPUT_DIR, outName);

        await mkdir(outDir, { recursive: true });

        const files = await readdir(srcDir);
        const sorted = files.sort();

        for (const file of sorted) {
            const ext = extname(file).toLowerCase();
            const baseName = file.replace(ext, '');
            const srcPath = join(srcDir, file);
            const outPath = join(outDir, `${baseName}.png`);

            if (ext === '.png') {
                // Already PNG, just copy
                await copyFile(srcPath, outPath);
                console.log(`  Copied: ${srcPath} -> ${outPath}`);
            } else if (ext === '.gif') {
                // Convert GIF to PNG
                await sharp(srcPath, { animated: false })
                    .png()
                    .toFile(outPath);
                console.log(`  Converted: ${srcPath} -> ${outPath}`);
            }
        }
        console.log(`✓ Processed ${outName} (${sorted.length} frames)`);
    }

    console.log('\n✅ All sprites converted to PNG!');
}

convert().catch(console.error);
