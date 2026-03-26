import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://noniewicz.eu',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
