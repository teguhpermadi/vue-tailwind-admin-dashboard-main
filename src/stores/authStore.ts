// src/stores/authStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Definisikan tipe untuk objek user yang akan disimpan
interface User {
  id: string; // Atau number, sesuai dengan UUID/ID di backend Anda
  name: string;
  email: string;
  roles: string[]; // Array of role names (misal: ['admin', 'staff'])
  permissions: string[]; // Array of permission names (misal: ['create-teacher', 'view-student'])
  // Tambahkan properti lain yang relevan dari objek user backend Anda
}

export const useAuthStore = defineStore('auth', () => {
  // State: Data pengguna yang sedang login
  const user = ref<User | null>(null);

  // State: Token otentikasi dari backend (misal: Sanctum token)
  const token = ref<string | null>(localStorage.getItem('authToken')); // Coba ambil dari localStorage saat inisialisasi

  // Computed: Apakah user sudah terotentikasi?
  const isAuthenticated = computed(() => !!user.value && !!token.value);

  // Aksi: Menyimpan data user dan token setelah login berhasil
  const setUser = (userData: User, authToken: string) => {
    user.value = userData;
    token.value = authToken;
    // Simpan token dan data user ke localStorage agar persisten antar sesi
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  // Aksi: Menghapus data user dan token (saat logout)
  const clearAuth = () => {
    user.value = null;
    token.value = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  };

  // Getter/Helper: Memeriksa apakah user memiliki izin tertentu
  const can = (permissionName: string): boolean => {
    // Pastikan user ada dan memiliki daftar permissions
    return user.value ? user.value.permissions.includes(permissionName) : false;
  };

  // Getter/Helper: Memeriksa apakah user memiliki peran tertentu
  const hasRole = (roleName: string): boolean => {
    // Pastikan user ada dan memiliki daftar roles
    return user.value ? user.value.roles.includes(roleName) : false;
  };

  // Inisialisasi: Coba memuat kembali data user dan token dari localStorage saat store dibuat
  // Ini penting agar user tetap "login" saat browser direfresh
  if (token.value && localStorage.getItem('currentUser')) {
    try {
      user.value = JSON.parse(localStorage.getItem('currentUser') || '{}') as User;
      // Periksa apakah user yang dimuat valid (opsional)
      if (!user.value || !user.value.id || !user.value.permissions) {
        clearAuth(); // Hapus jika data tidak valid
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      clearAuth(); // Hapus jika ada error parsing
    }
  }

  // Kembalikan semua state, computed, dan aksi yang ingin diekspos
  return {
    user,
    token,
    isAuthenticated,
    setUser,
    clearAuth,
    can,
    hasRole,
  };
});