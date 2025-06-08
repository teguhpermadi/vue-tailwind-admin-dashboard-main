// unocss.config.ts
import { defineConfig } from 'unocss';
import presetIcons from '@unocss/preset-icons';
import presetUno from '@unocss/preset-uno'; // Jika Anda ingin utilitas UnoCSS dasar juga

export default defineConfig({
  presets: [
    presetUno(), // Ini memberikan utilitas dasar seperti m-1, p-2, flex, dll.
    presetIcons({
      // Opsi untuk preset-icons
      // Anda dapat menentukan koleksi ikon di sini, contoh:
      // collections: {
      //   mdi: () => import('@iconify-json/mdi/icons.json').then(i => i.default),
      //   // Jika Anda memiliki ikon kustom atau koleksi lain
      // }
      // default per koleksi adalah 'heroicons'
      // syntax: i-carbon-wifi (from @iconify-json/carbon)
      //         i-heroicons-check-circle-solid (from heroicons v2)
    }),
  ],
  // Jika Anda perlu memodifikasi safelist atau aturan khusus lainnya
  // safelist: ['i-heroicons-check-circle-solid', 'i-heroicons-trash-solid'], // Tambahkan jika ada masalah purging
});