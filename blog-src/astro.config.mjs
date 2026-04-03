import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  base: '/blog',
  outDir: '../blog',
  output: 'static',
  trailingSlash: 'always',
  site: 'https://fairpass.world',
  build: {
    assets: 'blog-assets',
  },
});
