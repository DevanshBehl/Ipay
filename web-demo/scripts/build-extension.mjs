// Bundles the extension's non-popup scripts into dist/ after `vite build`.
// The popup (index.html + assets) is produced by Vite; these three are
// self-contained scripts esbuild compiles to fixed filenames the manifest
// references. Run with emptyOutDir already done by Vite (we only add files).
import { build } from 'esbuild';

const common = {
  bundle: true,
  target: 'chrome111', // world:"MAIN" content scripts require Chrome 111+
  logLevel: 'info',
  legalComments: 'none',
};

await Promise.all([
  // MAIN-world provider and ISOLATED bridge are classic scripts → IIFE.
  build({ ...common, entryPoints: ['src/content/provider.ts'], outfile: 'dist/provider.js', format: 'iife' }),
  build({ ...common, entryPoints: ['src/content/bridge.ts'], outfile: 'dist/bridge.js', format: 'iife' }),
  // Background service worker is declared type:"module" in the manifest → ESM.
  build({ ...common, entryPoints: ['src/background.ts'], outfile: 'dist/background.js', format: 'esm' }),
]);

console.log('✓ extension scripts bundled (provider.js, bridge.js, background.js)');
