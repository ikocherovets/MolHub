import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/molecules': apiTarget,
      '/search': apiTarget,
      '/predict': apiTarget,
      '/health': apiTarget,
      '/docs': apiTarget,
      '/docs-json': apiTarget,
    },
  },
});
