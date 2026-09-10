import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        discography: resolve(__dirname, 'discography.html'),
        booking: resolve(__dirname, 'booking.html'),
      },
      output: {
        // Without this, Rollup's default chunking merges our shared GSAP/Lenis
        // runtime (needed on every page) with the lazy Supabase import boundary
        // into one ambiguously-named chunk, which then either both get
        // preloaded (defeats lazy-loading Supabase) or neither do (delays
        // GSAP/Lenis, which ARE needed immediately). Split them explicitly so
        // each gets the right loading behavior.
        manualChunks(id) {
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) {
            return 'vendor';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-sdk';
          }
        },
      },
    },
  },
});
