import './assets/main.css'
// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'jsvectormap/dist/jsvectormap.css'
import 'flatpickr/dist/flatpickr.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import VueApexCharts from 'vue3-apexcharts'
import { MotionPlugin } from '@vueuse/motion'
import motionPresets from '@/motionPresets'
import { createPinia } from 'pinia'; // Import createPinia
import { createI18n } from 'vue-i18n'; // Import createI18n

// Import Vue Toastification
import Toast, { type PluginOptions } from 'vue-toastification';
// Import the CSS or your custom CSS (jika Anda memiliki CSS custom untuk toast)
import 'vue-toastification/dist/index.css'; // <--- Import CSS bawaan

// Impor pesan bahasa Anda
import en from './locales/en.json'; // Bahasa Inggris
import id from './locales/id.json'; // Bahasa Indonesia

// Import SweetAlert2
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css';

const app = createApp(App)
const pinia = createPinia(); // Buat instance Pinia

// Konfigurasi opsional untuk Vue Toastification
// Anda bisa menyesuaikan options ini. Contoh:
const toastOptions: PluginOptions = {
  // Anda bisa mengatur posisi default, durasi, dll.
  // Misalnya:
  position: 'top-right', // Posisi toast
  timeout: 3000,         // Durasi toast (3 detik)
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
  transition: 'Vue-Toastification__fade', // Default transition
  maxToasts: 20, // Maksimal jumlah toast yang ditampilkan bersamaan
  newestOnTop: true, // Toast terbaru di 
};

// Konfigurasi Vue I18n
const i18n = createI18n({
  legacy: false, // Gunakan Composition API
  locale: 'id',  // Atur bahasa default
  fallbackLocale: 'en', // Bahasa cadangan jika string tidak ditemukan
  messages: {
    en, // Tambahkan pesan bahasa Inggris
    id  // Tambahkan pesan bahasa Indonesia
  },
  globalInjection: true, // Membuat $t tersedia di template tanpa import
});

app.use(Toast, toastOptions); // Daftarkan plugin dengan options
app.use(pinia); // Daftarkan Pinia
app.use(router)
app.use(VueApexCharts)
app.use(MotionPlugin, motionPresets)
app.use(i18n)
app.provide('Swal', Swal)
app.mount('#app')
