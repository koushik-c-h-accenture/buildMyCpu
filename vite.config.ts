import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base MUST match the GitHub repo name so assets resolve under
// https://koushik-c-h-accenture.github.io/buildMyCpu/
export default defineConfig({
  base: '/buildMyCpu/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split the heavy 3D stack into its own long-cached chunk so the rest of
        // the app (and repeat visits) load fast.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', '@supabase/supabase-js'],
        },
      },
    },
  },
});
