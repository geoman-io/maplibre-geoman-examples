import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { externalizeDeps } from "vite-plugin-externalize-deps"


// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(),externalizeDeps()],
})
