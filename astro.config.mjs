// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// Cesia's Truck — static, photo-forward, bilingual food-truck site.
// Image optimization (astro:assets) is on by default and powered by sharp,
// so the heavy source photos ship resized in modern formats. Per-image
// widths/formats are set on each <Image> in the components.
export default defineConfig({
  site: 'https://cesiastruck.com',
  trailingSlash: 'ignore',

  build: {
    inlineStylesheets: 'auto',
  },

  adapter: cloudflare(),
});