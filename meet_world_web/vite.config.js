import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    process: {
      env: {}
    }
  },
  optimizeDeps: {
    include: ['simple-peer', 'socket.io-client', 'events', 'util', 'buffer', 'stream-browserify']
  },
  build: {
    rollupOptions: {
      external: [],
    }
  },
  resolve: {
    alias: {
      events: 'events',
      util: 'util',
      stream: 'stream-browserify',
      buffer: 'buffer',
    }
  }
})
