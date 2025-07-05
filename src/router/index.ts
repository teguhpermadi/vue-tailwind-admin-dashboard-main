import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '../services/authService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/signin',
      name: 'Signin',
      component: () => import('../views/Auth/Signin.vue'),
      meta: {
        title: 'Signin',
        guestOnly: true,
      },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('../views/Auth/Signup.vue'),
      meta: {
        title: 'Signup',
        guestOnly: true,
      },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/Admin/Dashboard/Dashboard.vue'),
      meta: {
        title: 'Dashboard',
        requiresAuth: true,
      },
    },
    {
      path: '/teacher',
      name: 'teacher.index',
      component: () => import('../views/Admin/Teacher/TeacherIndex.vue'),
      meta: {
        title: 'Teacher',
        requiresAuth: true,
      },
    },
    {
      path: '/teacher/create', // Rute baru untuk membuat guru
      name: 'teacher.create',
      component: () => import('../views/Admin/Teacher/TeacherCreate.vue'),
      meta: { 
        title: 'Create Teacher',
        requiresAuth: true
       },
    },
    {
      path: '/teacher/:id/edit',
      name: 'teacher.edit',
      component: () => import('../views/Admin/Teacher/TeacherEdit.vue'),
      meta: {
        title: 'Edit Teacher',
        requiresAuth: true
      }
    },
    {
      path: '/student',
      name: 'student.index',
      component: () => import('../views/Admin/Student/StudentIndex.vue'),
      meta: {
        title: 'Student',
        requiresAuth: true
      },
    },
    {
      path: '/student/create', // Rute baru untuk membuat siswa
      name: 'student.create',
      component: () => import('../views/Admin/Student/StudentCreate.vue'),
      meta: { 
        title: 'Create Student',
        requiresAuth: true
       },
    },
    {
      path: '/student/:id/edit',
      name: 'student.edit',
      component: () => import('../views/Admin/Student/StudentEdit.vue'),
      meta: {
        title: 'Edit Student',
        requiresAuth: true
      }
    },
    {
      path: '/link-account',
      name: 'link.account',
      component: () => import('@/views/LinkAccountPage.vue'), // Pastikan path benar
      meta: { requiresAuth: true } // User harus login untuk menggunakan link ini
    },
    {
      path: '/',
      name: 'Ecommerce',
      component: () => import('../views/Ecommerce.vue'),
      meta: {
        title: 'eCommerce Dashboard',
      },
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('../views/Others/Calendar.vue'),
      meta: {
        title: 'Calendar',
      },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Others/UserProfile.vue'),
      meta: {
        title: 'Profile',
      },
    },
    {
      path: '/form-elements',
      name: 'Form Elements',
      component: () => import('../views/Forms/FormElements.vue'),
      meta: {
        title: 'Form Elements',
      },
    },
    {
      path: '/basic-tables',
      name: 'Basic Tables',
      component: () => import('../views/Tables/BasicTables.vue'),
      meta: {
        title: 'Basic Tables',
      },
    },
    {
      path: '/line-chart',
      name: 'Line Chart',
      component: () => import('../views/Chart/LineChart/LineChart.vue'),
    },
    {
      path: '/bar-chart',
      name: 'Bar Chart',
      component: () => import('../views/Chart/BarChart/BarChart.vue'),
    },
    {
      path: '/alerts',
      name: 'Alerts',
      component: () => import('../views/UiElements/Alerts.vue'),
      meta: {
        title: 'Alerts',
      },
    },
    {
      path: '/avatars',
      name: 'Avatars',
      component: () => import('../views/UiElements/Avatars.vue'),
      meta: {
        title: 'Avatars',
      },
    },
    {
      path: '/badge',
      name: 'Badge',
      component: () => import('../views/UiElements/Badges.vue'),
      meta: {
        title: 'Badge',
      },
    },

    {
      path: '/buttons',
      name: 'Buttons',
      component: () => import('../views/UiElements/Buttons.vue'),
      meta: {
        title: 'Buttons',
      },
    },

    {
      path: '/images',
      name: 'Images',
      component: () => import('../views/UiElements/Images.vue'),
      meta: {
        title: 'Images',
      },
    },
    {
      path: '/videos',
      name: 'Videos',
      component: () => import('../views/UiElements/Videos.vue'),
      meta: {
        title: 'Videos',
      },
    },
    {
      path: '/blank',
      name: 'Blank',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: {
        title: 'Blank',
      },
    },

    {
      path: '/error-404',
      name: '404 Error',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: {
        title: '404 Error',
      },
    },
  ],
})

export default router

router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth;
  const guestOnly = to.meta.guestOnly;
  const loggedIn = isAuthenticated(); // Memanggil fungsi untuk memeriksa status login

  if (requiresAuth && !loggedIn) {
    // Jika rute membutuhkan autentikasi TAPI user belum login,
    // alihkan ke halaman login.
    console.log('Redirecting to signin: Requires authentication');
    next('/signin');
  } else if (guestOnly && loggedIn) {
    // Jika rute hanya untuk "guest" (belum login) TAPI user sudah login,
    // alihkan ke dashboard (atau halaman lain yang sesuai untuk user yang sudah login).
    console.log('Redirecting to dashboard: Already logged in');
    next('/'); // Atau ke '/'
  } else {
    // Jika tidak ada kondisi di atas yang terpenuhi,
    // lanjutkan navigasi.
    next();
  }
  document.title = `Vue.js ${to.meta.title} | TailAdmin - Vue.js Tailwind CSS Dashboard Template`
})
