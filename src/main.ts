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

const app = createApp(App)
const pinia = createPinia(); // Buat instance Pinia

app.use(pinia); // Daftarkan Pinia
app.use(router)
app.use(VueApexCharts)
app.use(MotionPlugin, motionPresets)

app.mount('#app')
