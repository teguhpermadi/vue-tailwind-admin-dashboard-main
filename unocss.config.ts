// unocss.config.ts
import { defineConfig } from 'unocss';
import presetIcons from '@unocss/preset-icons';
import presetUno from '@unocss/preset-uno';

export default defineConfig({
  presets: [
    presetUno(), // Memungkinkan Anda menggunakan utilitas dasar UnoCSS
    presetIcons({
      // Opsi untuk preset-icons
      // Di sini Anda bisa menentukan koleksi ikon kustom jika perlu,
      // tetapi untuk Heroicons, preset ini secara default akan mengenali
      // sintaks i-heroicons-<nama_ikon>-<gaya>
      // Contoh gaya: solid, outline (v24), mini (v20)
    }),
  ],
  // Jika Anda menghadapi masalah purging, tambahkan kelas ikon yang Anda gunakan di sini
  // safelist: [
  //   'i-heroicons-trash-solid',
  //   'i-heroicons-check-circle-solid',
  //   'i-heroicons-x-circle-solid',
  //   'i-heroicons-funnel-solid',
  // ],
});