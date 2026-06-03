import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base MUST match the GitHub repo name so assets resolve under
// https://koushik-c-h-accenture.github.io/buildMyCpu/
export default defineConfig({
    base: '/buildMyCpu/',
    plugins: [react()],
});
