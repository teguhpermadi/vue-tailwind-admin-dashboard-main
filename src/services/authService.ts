// src/services/authService.ts
import api from './api'; // Pastikan `api` adalah instance Axios yang sudah dikonfigurasi

export interface LoginPayload {
  email: string;
  password: string;
  device_name: string; // <-- Tambahkan ini, penting untuk Laravel Sanctum!
}

// Interface User sudah OK
export interface User {
  id: string; // Karena Anda pakai ULID
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  // Anda bisa menambahkan role/permission di sini jika API mengembalikannya
  roles?: string[];
  permissions?: string[];
}

// Interface LoginResponse sudah OK
export interface LoginResponse {
  user: User;
  token: string;
  message?: string; // Tambahkan jika backend mengembalikan message juga
}

/**
 * Melakukan proses login ke API.
 * @param payload Objek berisi email, password, dan device_name.
 * @returns Promise yang resolve dengan objek LoginResponse.
 */
export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  try {
    // Sesuaikan endpoint jika perlu, contoh: /api/login
    const response = await api.post('/login', payload); // Backend Anda sudah di `/login` bukan `/auth/login`

    // Pastikan struktur respons API sesuai dengan yang diharapkan dari Laravel AuthController Anda
    // AuthController mengembalikan { message, user, token } langsung di root data
    const { user, token, message } = response.data;

    // Simpan token dan data user ke localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    return {
      user,
      token,
      message,
    };
  } catch (error: any) {
    // Tangani error, misalnya menampilkan pesan error dari backend
    console.error('Login failed:', error.response?.data || error.message);
    throw error; // Lempar error agar bisa ditangani di komponen yang memanggil
  }
};

/**
 * Melakukan proses registrasi user baru ke API.
 * @param data Objek berisi name, email, password, password_confirmation.
 * @returns Promise yang resolve dengan respons dari API.
 */
export const register = async (data: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  // Anda bisa menambahkan device_name di sini juga jika ingin user langsung login setelah register
  device_name?: string;
}): Promise<any> => { // Atau gunakan interface yang lebih spesifik untuk RegisterResponse
  try {
    // Sesuaikan endpoint jika perlu, contoh: /api/register
    // HILANGKAN `token: 'daftar-bebas-token'` karena tidak diperlukan oleh backend
    // Backend Anda tidak meminta token di sini untuk registrasi.
    const response = await api.post('/register', {
      ...data,
      // Jika Anda ingin user langsung login setelah register, tambahkan device_name di sini:
      device_name: data.device_name || 'web_browser', // Default jika tidak disediakan
    });

    // Jika register juga mengembalikan token dan user (seperti pada AuthController yang kita buat),
    // Anda mungkin ingin menyimpannya juga. Sesuaikan dengan respons backend Anda.
    if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error: any) {
    console.error('Registration failed:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Menghapus token dan data user dari localStorage (logout).
 */
export const logout = async (): Promise<void> => {
  try {
    // Opsional: Kirim permintaan logout ke backend untuk mencabut token
    // Ini penting jika Anda ingin token tersebut benar-benar tidak valid lagi di sisi server
    await api.post('/logout'); // Pastikan ini adalah endpoint yang dilindungi auth:sanctum

  } catch (error) {
    console.error('Error during backend logout:', error);
    // Lanjutkan membersihkan localStorage meskipun backend logout gagal
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

/**
 * Memeriksa apakah user saat ini dianggap terautentikasi (berdasarkan keberadaan token di localStorage).
 * @returns boolean true jika ada token, false jika tidak.
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * Mendapatkan data user yang tersimpan di localStorage.
 * @returns User | null
 */
export const getAuthenticatedUser = (): User | null => {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
};

/**
 * Menambahkan token ke header default Axios.
 * Berguna saat menginisialisasi `api` instance.
 * @param token Token API yang akan ditambahkan.
 */
export const setAuthToken = (token: string | null): void => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// Panggil saat aplikasi dimuat untuk mengatur token awal jika ada
const initialToken = localStorage.getItem('token');
if (initialToken) {
    setAuthToken(initialToken);
}