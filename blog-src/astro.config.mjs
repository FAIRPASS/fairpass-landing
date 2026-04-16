import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [tailwind(), sitemap()],
  base: '/journal',
  outDir: '../journal',
  output: 'static',
  trailingSlash: 'always',
  site: 'https://fairpass.world',
  build: {
    assets: 'journal-assets',
  },
});
