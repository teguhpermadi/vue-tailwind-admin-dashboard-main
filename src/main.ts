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

// --- Start Laravel Echo / Reverb Configuration ---
import Echo from 'laravel-echo';
import Pusher from 'pusher-js'; // Reverb uses Pusher protocol

// import Nprogress
import NProgress from 'nprogress'; // Import NProgress
import 'nprogress/nprogress.css'; // Import CSS default NProgress

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

// --- Tambahkan baris ini untuk debugging ---
// console.log("VITE_REVERB_APP_KEY:", import.meta.env.VITE_REVERB_APP_KEY);
// console.log("VITE_REVERB_HOST:", import.meta.env.VITE_REVERB_HOST);
// console.log("VITE_REVERB_PORT:", import.meta.env.VITE_REVERB_PORT);
// console.log("VITE_REVERB_SCHEME:", import.meta.env.VITE_REVERB_SCHEME);
window.Pusher = Pusher;

// Pastikan VITE_REVERB_APP_KEY dan VITE_REVERB_HOST_URL (atau serupa)
// didefinisikan di .env Anda dan diekspos melalui Vite
// Contoh .env:
// VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
// VITE_REVERB_HOST_URL="${REVERB_SCHEME}://${REVERB_HOST}:${REVERB_PORT}"
// (Jika Anda menggunakan Laravel Vite plugin, VITE_APP_ENV sudah cukup)

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME === 'https'),
    disableStats: true,
    encrypted: (import.meta.env.VITE_REVERB_SCHEME === 'https'),
    enabledTransports: ['ws', 'wss'],
    debug: true
});

// Log koneksi
window.Echo.connector.pusher.connection.bind('connected', () => {
  console.log('Echo connected to WebSocket server!');
});
window.Echo.connector.pusher.connection.bind('disconnected', () => {
  console.log('Echo disconnected from WebSocket server!');
});
window.Echo.connector.pusher.connection.bind('error', (err) => {
  console.error('Echo connection error:', err);
});
// --- End Laravel Echo / Reverb Configuration ---

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

// --- Vue Router Navigation Guards untuk NProgress ---
router.beforeEach((to, from, next) => {
  // Hanya mulai progress bar jika navigasi tidak dari rute yang sama atau jika ada perubahan param
  // Ini menghindari progress bar muncul pada perubahan query param yang kecil
  if (to.path !== from.path || JSON.stringify(to.query) !== JSON.stringify(from.query)) {
    NProgress.start(); // Mulai progress bar
  }
  next();
});

router.afterEach(() => {
  NProgress.done(); // Selesaikan progress bar setelah navigasi selesai
});

router.onError((error) => {
  console.error('Router navigation error:', error);
  NProgress.done(); // Pastikan progress bar selesai bahkan jika ada error navigasi
});

app.use(Toast, toastOptions); // Daftarkan plugin dengan options
app.use(pinia); // Daftarkan Pinia
app.use(router)
app.use(VueApexCharts)
app.use(MotionPlugin, motionPresets)
app.use(i18n)
app.provide('Swal', Swal)
app.mount('#app')
