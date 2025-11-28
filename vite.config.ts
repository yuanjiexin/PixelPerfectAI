import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use '.' to refer to the current working directory.
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Safely inject API_KEY. 
      // NOTE: Do not define "process.env" as an object, it breaks other libraries.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})