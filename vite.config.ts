import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // process.cwd() is now typed in vite-env.d.ts
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY so usage in services/geminiService.ts works without changes
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Prevent "process is not defined" error if libraries try to access process.env
      'process.env': {}
    }
  }
})