import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://noniewicz.eu',
  output: 'static',
  // Plain code blocks styled by .post pre, so they follow the light/dark toggle.
  markdown: { syntaxHighlight: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
