import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('node_modules/lucide')) return 'vendor-icons';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
