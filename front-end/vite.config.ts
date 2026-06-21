import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    // Emit the build into a top-level `static-assets/` folder that the Rust
    // server serves. `emptyOutDir` is required because the directory lives
    // outside this project root.
    outDir: '../static-assets',
    emptyOutDir: true,
  },

  server: {
    proxy: {
      // In dev, forward API calls to the backend (`cargo run`)
      '/api': 'http://localhost:3000',
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
