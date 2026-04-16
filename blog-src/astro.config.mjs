import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  base: '/journal',
  outDir: '../journal',
  output: 'static',
  trailingSlash: 'always',
  site: 'https://fairpass.world',
  build: {
    assets: 'journal-assets',
  },
});
