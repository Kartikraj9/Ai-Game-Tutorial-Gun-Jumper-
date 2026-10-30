import { defineConfig } from 'vite';

// Custom plugin: strips type="module" and crossorigin from script tags in built HTML.
// Required for itch.io's CDN iframe which blocks ES module cross-origin requests.
const itchioCompatPlugin = {
    name: 'itchio-compat',
    transformIndexHtml(html) {
        return html
            .replace(/<script type="module" crossorigin/g, '<script')
            .replace(/<link rel="modulepreload" crossorigin[^>]*>/g, '');
    }
};

export default defineConfig({
    base: './',
    plugins: [itchioCompatPlugin],
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsInlineLimit: 0,
        target: 'es2015',
        rollupOptions: {
            output: {
                // Use a classic (non-module) bundle so itch.io's iframe CDN doesn't block it
                format: 'iife',
                name: 'GunJumper',
                entryFileNames: 'assets/game.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name][extname]',
            }
        }
    }
});
