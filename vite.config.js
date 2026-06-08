import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Adds 'import' condition so react-redux, immer, and similar packages
    // resolve to their ESM builds under Rolldown (Vite 8 production bundler).
    // Without this, Rolldown falls through to the 'default' (CJS) exports of
    // packages like react-redux v9, causing "t is not a function" at runtime.
    conditions: ['import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    include: ['recharts', 'react-redux', '@reduxjs/toolkit', 'immer'],
  },
})
