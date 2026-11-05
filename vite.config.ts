import { defineConfig } from 'vite';

// GitHub Pages hosts project sites below /<repository>/.
// Keep the root path during local development, and set the correct
// asset URLs when generating the production site.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Rust-Stability-Raid-Calculator/' : '/',
}));
